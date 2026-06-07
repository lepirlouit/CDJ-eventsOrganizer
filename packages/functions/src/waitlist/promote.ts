import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove, sendEmail, promotedFromWaitlistEmail } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId, id: waitlistId } = event.pathParameters ?? {};
  if (!eventId || !waitlistId) return err("Missing eventId or id", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const waitlistItems = await db.entities.waitlistEntry.query.byEvent({ eventId })
    .where(({ status }, op) => op.eq(status, "waiting"))
    .go();

  const entry = waitlistItems.data.find((w) => w.waitlistId === waitlistId);
  if (!entry) return err("Waitlist entry not found", 404);

  const newRegId = ulid();
  await db.entities.registration.put({
    registrationId: newRegId,
    eventId: entry.eventId,
    dojoId: entry.dojoId,
    userId: entry.userId,
    ninjaName: entry.ninjaName,
    ninjaBirthdate: entry.ninjaBirthdate,
    parentName: entry.parentName,
    parentEmail: entry.parentEmail,
    parentPhone: entry.parentPhone,
    atelierId: entry.atelierId,
    needsComputer: entry.needsComputer,
    previousVisits: entry.previousVisits,
    heardAbout: entry.heardAbout,
    consentPhotos: entry.consentPhotos,
    consentContact: entry.consentContact,
    isCoachChild: entry.isCoachChild,
    status: "confirmed",
    checkedIn: false,
  }).go();

  await db.entities.waitlistEntry.patch({ eventId, positionPadded: entry.positionPadded, waitlistId: entry.waitlistId })
    .set({ status: "promoted" })
    .go();

  await db.entities.event.patch({ dojoId: ev.dojoId, eventId })
    .add({ registrationCount: 1, waitlistCount: -1 })
    .go();

  const template = promotedFromWaitlistEmail("en", {
    parentName: entry.parentName,
    ninjaName: entry.ninjaName,
    eventTitle: ev.title,
    eventDate: ev.date,
    eventAddress: ev.location?.address ?? "",
  });
  await sendEmail({ to: entry.parentEmail, ...template }).catch(console.error);

  return ok({ promoted: true, registrationId: newRegId });
};
