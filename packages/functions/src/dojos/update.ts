import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (claims["custom:role"] !== "super_admin") return err("Forbidden", 403);

  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { name, city, address, waitlistMode, active, latitude, longitude } = body;

  const existing = await db.entities.dojo.query.byId({ dojoId }).go();
  if (!existing.data[0]) return err("Dojo not found", 404);

  await db.entities.dojo.patch({ dojoId })
    .set({
      ...(name !== undefined && { name }),
      ...(city !== undefined && { city }),
      ...(address !== undefined && { address }),
      ...(waitlistMode !== undefined && { waitlistMode }),
      ...(active !== undefined && { active }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
    })
    .go();

  const updated = await db.entities.dojo.query.byId({ dojoId }).go();
  return ok(updated.data[0]);
};
