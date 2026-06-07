import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoLeadCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { name, maxSeats } = body;
  if (!name) return err("name required", 400);

  const atelierId = ulid();
  const newAtelier = { atelierId, name, isCustom: true, maxSeats };
  const ateliers = [...(ev.ateliers ?? []), newAtelier];

  await db.entities.event.patch({ dojoId: ev.dojoId, eventId }).set({ ateliers }).go();
  return ok(newAtelier, 201);
};
