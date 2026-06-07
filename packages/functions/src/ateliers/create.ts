import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { name, maxSeats } = body;
  if (!name) return err("name required", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  if (claims["custom:role"] !== "super_admin" && ev.dojoId !== claims["custom:dojoId"]) {
    return err("Forbidden", 403);
  }

  const atelierId = ulid();
  const newAtelier = { atelierId, name, isCustom: true, maxSeats };
  const ateliers = [...(ev.ateliers ?? []), newAtelier];

  await db.entities.event.patch({ dojoId: ev.dojoId, eventId })
    .set({ ateliers })
    .go();

  return ok(newAtelier, 201);
};
