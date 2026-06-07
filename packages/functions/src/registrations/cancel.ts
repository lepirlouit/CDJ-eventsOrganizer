import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, cancelRegistration, sendEmail, promotedFromWaitlistEmail } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { registrationId } = event.pathParameters ?? {};
  if (!registrationId) return err("Missing registrationId", 400);

  // Find the registration first to get eventId
  const regByUser = await db.entities.registration.query.byUser({ userId: claims.sub })
    .where(({ registrationId: rid }, op) => op.eq(rid, registrationId))
    .go();
  const reg = regByUser.data[0];
  if (!reg) return err("Registration not found", 404);

  const eventResult = await db.entities.event.query.byId({ eventId: reg.eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  try {
    await cancelRegistration({
      registrationId,
      eventId: reg.eventId,
      userId: claims.sub,
      waitlistMode: ev.waitlistMode,
    });
  } catch (e: any) {
    return err(e.message, e.statusCode ?? 500);
  }

  // Auto-promote from waitlist if mode is auto
  if (ev.waitlistMode === "auto") {
    const waitlist = await db.entities.waitlistEntry.query.byEvent({ eventId: reg.eventId })
      .where(({ status }, op) => op.eq(status, "waiting"))
      .go();

    const first = waitlist.data.sort((a, b) => a.positionPadded.localeCompare(b.positionPadded))[0];

    if (first) {
      const newRegId = ulid();
      await db.entities.registration.put({
        registrationId: newRegId,
        eventId: first.eventId,
        dojoId: first.dojoId,
        userId: first.userId,
        ninjaName: first.ninjaName,
        ninjaBirthdate: first.ninjaBirthdate,
        parentName: first.parentName,
        parentEmail: first.parentEmail,
        parentPhone: first.parentPhone,
        atelierId: first.atelierId,
        needsComputer: first.needsComputer,
        previousVisits: first.previousVisits,
        heardAbout: first.heardAbout,
        consentPhotos: first.consentPhotos,
        consentContact: first.consentContact,
        isCoachChild: first.isCoachChild,
        status: "confirmed",
        checkedIn: false,
      }).go();

      await db.entities.waitlistEntry.patch({ eventId: first.eventId, positionPadded: first.positionPadded, waitlistId: first.waitlistId })
        .set({ status: "promoted" })
        .go();

      await db.entities.event.patch({ dojoId: ev.dojoId, eventId: ev.eventId })
        .add({ registrationCount: 1, waitlistCount: -1 })
        .go();

      const template = promotedFromWaitlistEmail("en", {
        parentName: first.parentName,
        ninjaName: first.ninjaName,
        eventTitle: ev.title,
        eventDate: ev.date,
        eventAddress: ev.location?.address ?? "",
      });
      await sendEmail({ to: first.parentEmail, ...template }).catch(console.error);
    }
  }

  return ok({ cancelled: true });
};
