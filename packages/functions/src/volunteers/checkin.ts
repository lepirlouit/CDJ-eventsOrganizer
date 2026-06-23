import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId, userId } = event.pathParameters ?? {};
  if (!eventId || !userId) return err("Missing eventId or userId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const volResult = await db.entities.eventVolunteer.get({ eventId, userId }).go();
  const vol = volResult.data;
  if (!vol || vol.status !== "active") return err("Volunteer not found", 404);

  const { checkedIn } = JSON.parse(event.body ?? "{}");

  await db.entities.eventVolunteer.patch({ eventId, userId })
    .set(
      checkedIn
        ? { checkedIn: true, checkedInAt: new Date().toISOString(), checkedInBy: claims.sub }
        : { checkedIn: false, checkedInAt: undefined, checkedInBy: undefined }
    )
    .go();

  return ok({ checkedIn: !!checkedIn, eventId, userId });
};
