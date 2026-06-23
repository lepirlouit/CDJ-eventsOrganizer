import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, getClaims, getDbUserId } from "@coderdojo/core";

const ERASED = "[erased]";

/**
 * GDPR right to erasure. Pseudonymizes the caller's personal data in place:
 * registration/waitlist/volunteer records are kept (so event history and
 * capacity counts stay intact) but stripped of identifying fields, child
 * profiles are deleted, and the user profile is cleared.
 *
 * Note: removing the Cognito identity itself (so the email can no longer sign
 * in) is a separate admin step — documented in GDPR.md.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const sub = claims.sub;

  const [registrations, waitlist, volunteering, children] = await Promise.all([
    db.entities.registration.query.byUser({ userId: sub }).go(),
    db.entities.waitlistEntry.query.byUser({ userId: sub }).go(),
    db.entities.eventVolunteer.query.byUser({ userId: sub }).go(),
    db.entities.child.query.byUser({ userId: sub }).go(),
  ]);

  for (const r of registrations.data) {
    await db.entities.registration.patch({ eventId: r.eventId, registrationId: r.registrationId })
      .set({ ninjaName: ERASED, parentName: ERASED, parentEmail: ERASED, parentPhone: ERASED })
      .remove(["heardAbout", "customAnswers", "ninjaGender"])
      .go();
  }

  for (const w of waitlist.data) {
    await db.entities.waitlistEntry.patch({ eventId: w.eventId, positionPadded: w.positionPadded, waitlistId: w.waitlistId })
      .set({ ninjaName: ERASED, parentName: ERASED, parentEmail: ERASED, parentPhone: ERASED })
      .remove(["heardAbout", "customAnswers", "ninjaGender"])
      .go();
  }

  for (const v of volunteering.data) {
    await db.entities.eventVolunteer.patch({ eventId: v.eventId, userId: v.userId })
      .set({ coachName: ERASED, coachEmail: ERASED })
      .remove(["skills", "notes"])
      .go();
  }

  for (const c of children.data) {
    await db.entities.child.delete({ childId: c.childId }).go();
  }

  const dbUserId = await getDbUserId(db, claims);
  if (dbUserId) {
    await db.entities.user.patch({ userId: dbUserId })
      .set({ name: ERASED })
      .remove(["phone", "parentName", "parentPhone", "heardAbout", "savedChildren", "consentPhotos", "consentContact"])
      .go();
  }

  return ok({
    erased: true,
    registrations: registrations.data.length,
    waitlistEntries: waitlist.data.length,
    volunteering: volunteering.data.length,
    children: children.data.length,
  });
};
