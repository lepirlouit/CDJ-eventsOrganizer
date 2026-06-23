import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach, sendEmail, broadcastEmail } from "@coderdojo/core";

/**
 * Lead-coach: email a dojo's registrants. The recipient list is derived from
 * registrations that opted in via `consentContact` — there is no separate
 * subscribe list. Audience:
 *   - "all"        → everyone who ever registered at this dojo (promote next event)
 *   - "last_event" → only the most recent published event's registrants
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { subject, message, audience } = body;
  if (!subject || !message) return err("subject and message required", 400);

  let regs;
  if (audience === "last_event") {
    const events = await db.entities.event.query.byDojo({ dojoId }).go();
    const published = events.data
      .filter((e) => e.status === "published" || e.status === "completed")
      .sort((a, b) => b.date.localeCompare(a.date));
    if (published.length === 0) return err("No past events for this dojo", 404);
    const last = published[0];
    regs = await db.entities.registration.query
      .byEvent({ eventId: last.eventId })
      .where(({ status }, op) => op.ne(status, "cancelled"))
      .go();
  } else {
    regs = await db.entities.registration.query
      .byDojo({ dojoId })
      .where(({ status }, op) => op.ne(status, "cancelled"))
      .go();
  }

  // Opt-in only, deduplicated by email.
  const emails = [
    ...new Set(regs.data.filter((r) => r.consentContact).map((r) => r.parentEmail)),
  ];

  const template = broadcastEmail({ subject, message });
  let sent = 0;
  for (const to of emails) {
    try {
      await sendEmail({ to, ...template });
      sent += 1;
    } catch (e) {
      console.error("broadcast send failed", to, e);
    }
  }

  return ok({ recipients: emails.length, sent });
};
