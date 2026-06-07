import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const today = new Date().toISOString().slice(0, 10);

  const result = await db.entities.event.query
    .allEvents({})
    .gte({ date: today })
    .where(({ status }, op) => op.eq(status, "published"))
    .go();

  return ok(result.data);
};
