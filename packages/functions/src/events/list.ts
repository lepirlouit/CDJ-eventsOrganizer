import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const now = new Date().toISOString();
  const result = await db.entities.event.query.byDojo({ dojoId })
    .where(({ status }, op) => op.eq(status, "published"))
    .go();

  const upcoming = result.data.filter((e) => e.date >= now.slice(0, 10)).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  return ok(upcoming);
};
