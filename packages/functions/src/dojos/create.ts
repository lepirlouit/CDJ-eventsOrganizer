import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (claims["custom:role"] !== "super_admin") return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { name, city, address, waitlistMode, latitude, longitude } = body;
  if (!name || !city || !address) return err("name, city, address required", 400);

  const dojoId = ulid();
  await db.entities.dojo.put({
    dojoId,
    name,
    city,
    address,
    waitlistMode: waitlistMode ?? "auto",
    active: true,
    latitude,
    longitude,
  }).go();

  const result = await db.entities.dojo.query.byId({ dojoId }).go();
  return ok(result.data[0], 201);
};
