import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId, registrationId } = event.pathParameters ?? {};
  if (!eventId || !registrationId) return err("Missing eventId or registrationId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  if (claims["custom:role"] !== "super_admin" && ev.dojoId !== claims["custom:dojoId"]) {
    return err("Forbidden — wrong dojo", 403);
  }

  const regResult = await db.entities.registration.query.byEvent({ eventId })
    .where(({ registrationId: rid }, op) => op.eq(rid, registrationId))
    .go();
  const reg = regResult.data[0];
  if (!reg) return err("Registration not found", 404);

  await db.entities.registration.patch({ eventId, registrationId })
    .set({ checkedIn: false })
    .remove(["checkedInAt", "checkedInBy"])
    .go();

  return ok({ checkedIn: false, registrationId });
};
