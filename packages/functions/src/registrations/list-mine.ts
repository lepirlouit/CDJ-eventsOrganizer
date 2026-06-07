import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const result = await db.entities.registration.query.byUser({ userId: claims.sub })
    .where(({ status }, op) => op.ne(status, "cancelled"))
    .go();
  return ok(result.data);
};
