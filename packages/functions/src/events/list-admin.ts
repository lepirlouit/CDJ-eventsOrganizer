import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const result = await db.entities.event.query.byDojo({ dojoId }).go();

  const sorted = result.data.sort((a, b) => b.date.localeCompare(a.date));

  return ok(sorted);
};
