import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId, id } = event.pathParameters ?? {};
  if (!eventId || !id) return err("Missing eventId or id", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoLeadCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const ateliers = (ev.ateliers ?? []).filter((a) => a.atelierId !== id);
  await db.entities.event.patch({ dojoId: ev.dojoId, eventId }).set({ ateliers }).go();
  return ok({ deleted: true });
};
