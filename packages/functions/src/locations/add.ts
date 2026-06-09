import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { name, address, city, latitude, longitude, mapsUrl } = body;
  if (!name || !address || !city) return err("name, address, city required", 400);

  const dojoResult = await db.entities.dojo.query.byId({ dojoId }).go();
  const dojo = dojoResult.data[0];
  if (!dojo) return err("Dojo not found", 404);

  const newLocation = {
    locationId: ulid(),
    name,
    address,
    city,
    ...(latitude !== undefined && { latitude }),
    ...(longitude !== undefined && { longitude }),
    ...(mapsUrl !== undefined && { mapsUrl }),
  };

  const locations = [...(dojo.locations ?? []), newLocation];
  await db.entities.dojo.patch({ dojoId }).set({ locations }).go();

  return ok(newLocation, 201);
};
