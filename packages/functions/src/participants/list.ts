import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  // All non-cancelled registrations at this dojo, across every event.
  const regResult = await db.entities.registration.query
    .byDojo({ dojoId })
    .where(({ status }, op) => op.ne(status, "cancelled"))
    .go();
  const regs = regResult.data;

  // Batch-get authoritative child profiles for the distinct childIds present.
  const childIds = [...new Set(regs.map((r) => r.childId).filter(Boolean) as string[])];
  const childById = new Map<string, { name: string; birthdate: string; participantId?: string }>();
  if (childIds.length > 0) {
    const got = await db.entities.child.get(childIds.map((childId) => ({ childId }))).go();
    for (const c of got.data) childById.set(c.childId, c);
  }

  type Group = {
    participantId: string;
    name: string;
    birthdate: string;
    childIds: string[];
    registrations: typeof regs;
  };
  const groups = new Map<string, Group>();

  for (const r of regs) {
    const child = r.childId ? childById.get(r.childId) : undefined;
    // Effective participant id: merged participantId → childId → (legacy) registrationId.
    const effId = child?.participantId ?? r.childId ?? r.registrationId;
    const name = child?.name ?? r.ninjaName;
    const birthdate = child?.birthdate ?? r.ninjaBirthdate;

    let g = groups.get(effId);
    if (!g) {
      g = { participantId: effId, name, birthdate, childIds: [], registrations: [] };
      groups.set(effId, g);
    }
    if (r.childId && !g.childIds.includes(r.childId)) g.childIds.push(r.childId);
    g.registrations.push(r);
  }

  // Merge candidates: distinct participant groups sharing a normalized name+birthdate.
  const keyToParticipants = new Map<string, Set<string>>();
  for (const g of groups.values()) {
    const key = `${normalize(g.name)}|${g.birthdate}`;
    const set = keyToParticipants.get(key) ?? new Set<string>();
    set.add(g.participantId);
    keyToParticipants.set(key, set);
  }

  const participants = [...groups.values()].map((g) => {
    const key = `${normalize(g.name)}|${g.birthdate}`;
    const confirmed = g.registrations.filter((r) => r.status === "confirmed").length;
    return {
      participantId: g.participantId,
      name: g.name,
      birthdate: g.birthdate,
      childIds: g.childIds,
      visits: g.registrations.length,
      confirmedVisits: confirmed,
      registrations: g.registrations,
      mergeCandidate: (keyToParticipants.get(key)?.size ?? 0) > 1,
    };
  });

  participants.sort((a, b) => a.name.localeCompare(b.name));
  return ok({ participants });
};
