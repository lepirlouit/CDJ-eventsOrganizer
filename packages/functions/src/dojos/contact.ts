import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, sendEmail, contactDojoEmail, contactDojoConfirmationEmail, getUserLang } from "@coderdojo/core";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public: a website visitor contacts a dojo. The message is routed by email to
 * the dojo's lead coaches, and the visitor gets a confirmation. No auth — basic
 * anti-abuse via input length caps. (API Gateway throttling guards volume.)
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const visitorName = String(body.visitorName ?? "").trim();
  const visitorEmail = String(body.visitorEmail ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!visitorName || !visitorEmail || !message) return err("All fields are required", 400);
  if (!EMAIL_RE.test(visitorEmail)) return err("Invalid email address", 400);
  if (visitorName.length > 120 || visitorEmail.length > 200 || message.length > 4000) {
    return err("Input too long", 400);
  }

  const dojoResult = await db.entities.dojo.query.byId({ dojoId }).go();
  const dojo = dojoResult.data[0];
  if (!dojo) return err("Dojo not found", 404);

  // Resolve the dojo's lead coaches → emails.
  const memberships = await db.entities.dojoMembership.query.byDojo({ dojoId }).go();
  const leadCoachIds = memberships.data.filter((m) => m.role === "lead_coach").map((m) => m.userId);
  const coachEmails = new Set<string>();
  for (const userId of leadCoachIds) {
    const u = await db.entities.user.query.byId({ userId }).go();
    if (u.data[0]?.email) coachEmails.add(u.data[0].email);
  }

  if (coachEmails.size === 0) return err("This dojo has no lead coach to contact yet", 409);

  // Notify each lead coach in their preferred language.
  for (const userId of leadCoachIds) {
    const u = await db.entities.user.query.byId({ userId }).go();
    const to = u.data[0]?.email;
    if (!to) continue;
    const lang = await getUserLang(db, userId);
    const template = contactDojoEmail(lang, { dojoName: dojo.name, visitorName, visitorEmail, message });
    await sendEmail({ to, ...template }).catch((e) => console.error("contact send failed", to, e));
  }

  // Confirm to the visitor (default language — they're not a known user).
  await sendEmail({ to: visitorEmail, ...contactDojoConfirmationEmail("en", { dojoName: dojo.name }) })
    .catch((e) => console.error("contact confirmation failed", e));

  return ok({ sent: true });
};
