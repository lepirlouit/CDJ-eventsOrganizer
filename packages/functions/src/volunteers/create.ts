import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach, sendEmail, volunteerConfirmedEmail } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const userResult = await db.entities.user.query.byEmail({ email: claims.email }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  const { skills, notes, lang: rawLang } = body;
  const base = (rawLang ?? "").split("-")[0];
  const lang = base === "fr" || base === "nl" ? base : (user.preferredLang ?? "en");

  const existing = await db.entities.eventVolunteer.query.byEvent({ eventId })
    .where(({ userId }, op) => op.eq(userId, claims.sub))
    .go();
  const alreadyActive = existing.data.some((v) => v.status === "active");
  if (alreadyActive) return err("Already signed up as volunteer", 409);

  await db.entities.eventVolunteer.put({
    eventId,
    dojoId: ev.dojoId,
    userId: claims.sub,
    coachName: user.name,
    coachEmail: user.email,
    skills,
    notes,
    signedUpAt: new Date().toISOString(),
    status: "active",
  }).go();

  const template = volunteerConfirmedEmail(lang as "en" | "fr" | "nl", {
    coachName: user.name,
    eventTitle: ev.title,
    eventDate: ev.date,
  });
  await sendEmail({ to: user.email, ...template }).catch(console.error);

  return ok({ volunteered: true, eventId }, 201);
};
