import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const result = await db.entities.dojoMembership.query.byUser({ userId: claims.sub }).go();

  // Enrich with dojo names
  const enriched = await Promise.all(
    result.data.map(async (m) => {
      const dojo = await db.entities.dojo.query.byId({ dojoId: m.dojoId }).go();
      return { ...m, dojoName: dojo.data[0]?.name, dojoCity: dojo.data[0]?.city };
    })
  );

  return ok(enriched);
};
