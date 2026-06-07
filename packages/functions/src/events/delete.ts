import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const existing = eventResult.data[0];
  if (!existing) return err("Event not found", 404);

  if (claims["custom:role"] !== "super_admin" && existing.dojoId !== claims["custom:dojoId"]) {
    return err("Forbidden", 403);
  }

  await db.entities.event.delete({ dojoId: existing.dojoId, eventId }).go();
  return ok({ deleted: true });
};
