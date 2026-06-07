import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const result = await db.entities.dojo.query.allDojos({}).go();
  return ok(result.data);
};
