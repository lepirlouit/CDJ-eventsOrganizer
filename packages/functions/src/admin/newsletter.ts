import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, sendEmail, broadcastEmail } from "@coderdojo/core";

/**
 * Super-admin: send a newsletter to every coach and lead coach across all dojos.
 * Recipients are derived from DojoMembership, deduplicated by user.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isSuperAdmin(claims)) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { subject, message } = body;
  if (!subject || !message) return err("subject and message required", 400);

  // Scan all memberships, collect distinct userIds, resolve their emails.
  const memberships = await db.entities.dojoMembership.scan.go();
  const userIds = [...new Set(memberships.data.map((m) => m.userId))];

  const emails = new Set<string>();
  for (const userId of userIds) {
    const u = await db.entities.user.query.byId({ userId }).go();
    if (u.data[0]?.email) emails.add(u.data[0].email);
  }

  const template = broadcastEmail({ subject, message });
  let sent = 0;
  for (const to of emails) {
    try {
      await sendEmail({ to, ...template });
      sent += 1;
    } catch (e) {
      console.error("newsletter send failed", to, e);
    }
  }

  return ok({ recipients: emails.size, sent });
};
