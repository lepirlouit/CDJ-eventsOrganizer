import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const existing = await db.entities.eventVolunteer.query.byEvent({ eventId })
    .where(({ userId }, op) => op.eq(userId, claims.sub))
    .go();

  const entry = existing.data[0];
  if (!entry) return err("Volunteer sign-up not found", 404);

  await db.entities.eventVolunteer.patch({ eventId, userId: claims.sub })
    .set({ status: "withdrawn" })
    .go();

  return ok({ withdrawn: true });
};
