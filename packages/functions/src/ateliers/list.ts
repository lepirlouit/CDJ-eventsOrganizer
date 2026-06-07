import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ok, GLOBAL_ATELIERS } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  return ok(GLOBAL_ATELIERS);
};
