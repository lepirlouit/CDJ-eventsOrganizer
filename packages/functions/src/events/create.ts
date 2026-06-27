import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";
import { GLOBAL_ATELIERS } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const {
    title, description, date, location, maxCapacity, coachReservedSeats,
    registrationOpenAt, registrationCloseAt, releaseAt, atelierIds, ateliers, status,
  } = body;

  if (!title || !date || !maxCapacity || !registrationOpenAt || !registrationCloseAt) {
    return err("title, date, maxCapacity, registrationOpenAt, registrationCloseAt required", 400);
  }

  const VALID_STATUSES = ["draft", "published", "cancelled", "completed"] as const;
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return err("invalid status", 400);
  }

  if (coachReservedSeats !== undefined && coachReservedSeats > maxCapacity) {
    return err("coachReservedSeats cannot exceed maxCapacity", 400);
  }

  // Resolve a track/atelier name from the dojo catalog, then the global list.
  const dojoResult = await db.entities.dojo.query.byId({ dojoId }).go();
  const dojoTracks = dojoResult.data[0]?.tracks ?? [];
  const nameFor = (id: string, fallback?: string) =>
    dojoTracks.find((tr) => tr.trackId === id)?.name ??
    GLOBAL_ATELIERS.find((a) => a.id === id)?.name ??
    fallback ?? id;

  let eventAteliers: { atelierId: string; name: string; isCustom: boolean; maxSeats?: number }[];
  if (Array.isArray(ateliers) && ateliers.length > 0) {
    // Rich form: each selected track may carry its own maxSeats.
    eventAteliers = ateliers.map((a: { atelierId: string; name?: string; maxSeats?: number }) => ({
      atelierId: a.atelierId,
      name: nameFor(a.atelierId, a.name),
      isCustom: !GLOBAL_ATELIERS.some((g) => g.id === a.atelierId),
      ...(a.maxSeats !== undefined && a.maxSeats !== null && { maxSeats: a.maxSeats }),
    }));
  } else {
    // Legacy form: list of ids, or default to all global ateliers.
    eventAteliers = (atelierIds ?? GLOBAL_ATELIERS.map((a) => a.id)).map((id: string) => ({
      atelierId: id,
      name: nameFor(id),
      isCustom: !GLOBAL_ATELIERS.some((g) => g.id === id),
    }));
  }

  const eventId = ulid();
  await db.entities.event.put({
    eventId, dojoId, title, description, date, location,
    maxCapacity,
    coachReservedSeats: coachReservedSeats ?? 0,
    registrationCount: 0, coachRegistrationCount: 0, waitlistCount: 0,
    registrationOpenAt, registrationCloseAt, releaseAt,
    ateliers: eventAteliers,
    status: status ?? "draft",
  }).go();

  const result = await db.entities.event.query.byId({ eventId }).go();
  return ok(result.data[0], 201);
};
