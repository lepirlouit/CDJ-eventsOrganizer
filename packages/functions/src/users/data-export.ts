import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, getClaims, getDbUserId } from "@coderdojo/core";

/**
 * GDPR data subject access request: returns all personal data the system holds
 * for the authenticated caller (profile, children, registrations, waitlist,
 * volunteer records) as a JSON document the user can download.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const sub = claims.sub;

  // Profile lives under the DynamoDB ULID; everything else keys on the Cognito sub.
  const dbUserId = await getDbUserId(db, claims);
  const [profile, children, registrations, waitlist, volunteering] = await Promise.all([
    dbUserId ? db.entities.user.query.byId({ userId: dbUserId }).go() : Promise.resolve({ data: [] }),
    db.entities.child.query.byUser({ userId: sub }).go(),
    db.entities.registration.query.byUser({ userId: sub }).go(),
    db.entities.waitlistEntry.query.byUser({ userId: sub }).go(),
    db.entities.eventVolunteer.query.byUser({ userId: sub }).go(),
  ]);

  return ok({
    exportedAt: new Date().toISOString(),
    email: claims.email,
    profile: profile.data[0] ?? null,
    children: children.data,
    registrations: registrations.data,
    waitlistEntries: waitlist.data,
    volunteering: volunteering.data,
  });
};
