import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  if (claims["custom:role"] !== "super_admin" && ev.dojoId !== claims["custom:dojoId"]) {
    return err("Forbidden", 403);
  }

  const result = await db.entities.eventVolunteer.query.byEvent({ eventId })
    .where(({ status }, op) => op.eq(status, "active"))
    .go();

  return ok(result.data);
};
