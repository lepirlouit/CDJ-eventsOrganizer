import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const result = await db.entities.event.query.byId({ eventId }).go();
  if (!result.data[0]) return err("Event not found", 404);

  return ok(result.data[0]);
};
