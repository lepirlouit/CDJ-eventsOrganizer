import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId, id } = event.pathParameters ?? {};
  if (!eventId || !id) return err("Missing eventId or id", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  if (claims["custom:role"] !== "super_admin" && ev.dojoId !== claims["custom:dojoId"]) {
    return err("Forbidden", 403);
  }

  const ateliers = (ev.ateliers ?? []).filter((a) => a.atelierId !== id);
  await db.entities.event.patch({ dojoId: ev.dojoId, eventId })
    .set({ ateliers })
    .go();

  return ok({ deleted: true });
};
