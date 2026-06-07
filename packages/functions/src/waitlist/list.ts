import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const result = await db.entities.waitlistEntry.query.byEvent({ eventId })
    .where(({ status }, op) => op.eq(status, "waiting"))
    .go();

  const sorted = result.data.sort((a, b) => a.positionPadded.localeCompare(b.positionPadded));
  return ok(sorted);
};
