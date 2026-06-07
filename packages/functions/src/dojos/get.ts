import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const result = await db.entities.dojo.query.byId({ dojoId }).go();
  if (!result.data[0]) return err("Dojo not found", 404);

  return ok(result.data[0]);
};
