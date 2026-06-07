import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach, sendEmail, volunteerEventCancelledEmail } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const existing = eventResult.data[0];
  if (!existing) return err("Event not found", 404);

  const allowed = await requireDojoLeadCoach(db, claims.sub, existing.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const updates: Record<string, unknown> = {};

  const allowedFields = [
    "title", "description", "date", "location", "maxCapacity", "coachReservedSeats",
    "registrationOpenAt", "registrationCloseAt", "releaseAt", "status",
  ];
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  await db.entities.event.patch({ dojoId: existing.dojoId, eventId })
    .set(updates as any)
    .go();

  if (body.status === "cancelled" && existing.status !== "cancelled") {
    const volunteers = await db.entities.eventVolunteer.query.byEvent({ eventId }).go();
    await Promise.all(
      volunteers.data
        .filter((v) => v.status === "active")
        .map(async (v) => {
          await db.entities.eventVolunteer.patch({ eventId, userId: v.userId })
            .set({ status: "withdrawn" }).go();
          const template = volunteerEventCancelledEmail("en", {
            coachName: v.coachName,
            eventTitle: existing.title,
          });
          await sendEmail({ to: v.coachEmail, ...template }).catch(console.error);
        })
    );
  }

  const updated = await db.entities.event.query.byId({ eventId }).go();
  return ok(updated.data[0]);
};
