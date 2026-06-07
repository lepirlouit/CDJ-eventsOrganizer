import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const result = await db.entities.dojoMembership.query.byDojo({ dojoId }).go();

  // Enrich with user names
  const enriched = await Promise.all(
    result.data.map(async (m) => {
      const user = await db.entities.user.query.byId({ userId: m.userId }).go();
      return { ...m, name: user.data[0]?.name, email: user.data[0]?.email };
    })
  );

  return ok(enriched);
};
