import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const existing = eventResult.data[0];
  if (!existing) return err("Event not found", 404);

  const allowed = await requireDojoLeadCoach(db, claims.sub, existing.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  await db.entities.event.delete({ dojoId: existing.dojoId, eventId }).go();
  return ok({ deleted: true });
};
