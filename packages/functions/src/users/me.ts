import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const result = await db.entities.user.query.byEmail({ email: claims.email }).go();
  if (!result.data[0]) return err("User not found", 404);
  return ok(result.data[0]);
};
