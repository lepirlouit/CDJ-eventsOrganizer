import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const body = JSON.parse(event.body ?? "{}");
  const childIds: string[] = Array.isArray(body.childIds) ? body.childIds : [];
  if (childIds.length < 2) return err("Provide at least two childIds to merge", 400);

  const got = await db.entities.child.get(childIds.map((childId) => ({ childId }))).go();
  const children = got.data;
  if (children.length !== childIds.length) return err("Some children not found", 404);

  // Authz: caller must be a coach in at least one dojo where these children
  // have registered. Coaches are the trusted party reconciling duplicates.
  const dojoIds = new Set<string>();
  await Promise.all(
    childIds.map(async (childId) => {
      const regs = await db.entities.registration.query.byChild({ childId }).go();
      for (const r of regs.data) dojoIds.add(r.dojoId);
    })
  );
  let authorized = false;
  for (const dojoId of dojoIds) {
    if (await requireDojoCoach(db, claims.sub, dojoId, claims)) {
      authorized = true;
      break;
    }
  }
  if (!authorized) return err("Forbidden", 403);

  // Canonical participantId = earliest childId (ULIDs sort lexicographically by time).
  const participantId = [...childIds].sort()[0];
  await Promise.all(
    children.map((c) => db.entities.child.patch({ childId: c.childId }).set({ participantId }).go())
  );

  return ok({ participantId, merged: childIds });
};
