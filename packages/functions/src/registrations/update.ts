import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { registrationId } = event.pathParameters ?? {};
  if (!registrationId) return err("Missing registrationId", 400);

  const body = JSON.parse(event.body ?? "{}");

  // Find registration
  const regs = await db.entities.registration.query.byDojo({ dojoId: claims["custom:dojoId"] })
    .where(({ registrationId: rid }, op) => op.eq(rid, registrationId))
    .go();
  const reg = regs.data[0];
  if (!reg) return err("Registration not found", 404);

  await db.entities.registration.patch({ eventId: reg.eventId, registrationId })
    .set({ status: body.status })
    .go();

  return ok({ updated: true });
};
