import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";
import { GLOBAL_ATELIERS } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const {
    title, description, date, location, maxCapacity, coachReservedSeats,
    registrationOpenAt, registrationCloseAt, releaseAt, atelierIds,
  } = body;

  if (!title || !date || !maxCapacity || !registrationOpenAt || !registrationCloseAt) {
    return err("title, date, maxCapacity, registrationOpenAt, registrationCloseAt required", 400);
  }

  if (coachReservedSeats !== undefined && coachReservedSeats > maxCapacity) {
    return err("coachReservedSeats cannot exceed maxCapacity", 400);
  }

  const eventAteliers = (atelierIds ?? GLOBAL_ATELIERS.map((a) => a.id)).map((id: string) => {
    const global = GLOBAL_ATELIERS.find((a) => a.id === id);
    return global
      ? { atelierId: id, name: global.name, isCustom: false }
      : { atelierId: id, name: id, isCustom: true };
  });

  const eventId = ulid();
  await db.entities.event.put({
    eventId,
    dojoId,
    title,
    description,
    date,
    location,
    maxCapacity,
    coachReservedSeats: coachReservedSeats ?? 0,
    registrationCount: 0,
    coachRegistrationCount: 0,
    waitlistCount: 0,
    registrationOpenAt,
    registrationCloseAt,
    releaseAt,
    ateliers: eventAteliers,
    status: "draft",
  }).go();

  const result = await db.entities.event.query.byId({ eventId }).go();
  return ok(result.data[0], 201);
};
