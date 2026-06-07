import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { registrationId } = event.pathParameters ?? {};
  if (!registrationId) return err("Missing registrationId", 400);

  const body = JSON.parse(event.body ?? "{}");

  // Find the registration via its eventId (provided in body or look it up)
  const { eventId, status } = body;
  if (!eventId) return err("eventId required in body", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoLeadCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  await db.entities.registration.patch({ eventId, registrationId })
    .set({ status })
    .go();

  return ok({ updated: true });
};
