import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId, registrationId } = event.pathParameters ?? {};
  if (!eventId || !registrationId) return err("Missing eventId or registrationId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const regResult = await db.entities.registration.query.byEvent({ eventId })
    .where(({ registrationId: rid }, op) => op.eq(rid, registrationId))
    .go();
  const reg = regResult.data[0];
  if (!reg) return err("Registration not found", 404);
  if (reg.status !== "confirmed") return err("Only confirmed registrations can be checked in", 409);
  if (reg.checkedIn) return err("Already checked in", 409);

  await db.entities.registration.patch({ eventId, registrationId })
    .set({ checkedIn: true, checkedInAt: new Date().toISOString(), checkedInBy: claims.sub })
    .go();

  return ok({ checkedIn: true, registrationId });
};
