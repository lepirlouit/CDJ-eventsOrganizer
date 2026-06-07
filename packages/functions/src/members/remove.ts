import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, userId } = event.pathParameters ?? {};
  if (!dojoId || !userId) return err("Missing dojoId or userId", 400);

  if (!isSuperAdmin(claims)) {
    const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
    if (!allowed) return err("Forbidden", 403);
  }

  await db.entities.dojoMembership.delete({ userId, dojoId }).go();
  return ok({ removed: true });
};
