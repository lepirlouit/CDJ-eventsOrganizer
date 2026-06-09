import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, locationId } = event.pathParameters ?? {};
  if (!dojoId || !locationId) return err("Missing dojoId or locationId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const dojoResult = await db.entities.dojo.query.byId({ dojoId }).go();
  const dojo = dojoResult.data[0];
  if (!dojo) return err("Dojo not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  const locations = (dojo.locations ?? []).map((loc) =>
    loc.locationId === locationId
      ? {
          ...loc,
          ...(body.name !== undefined && { name: body.name }),
          ...(body.address !== undefined && { address: body.address }),
          ...(body.city !== undefined && { city: body.city }),
          ...(body.latitude !== undefined && { latitude: body.latitude }),
          ...(body.longitude !== undefined && { longitude: body.longitude }),
          ...(body.mapsUrl !== undefined && { mapsUrl: body.mapsUrl }),
        }
      : loc
  );

  if (!locations.find((l) => l.locationId === locationId)) {
    return err("Location not found", 404);
  }

  await db.entities.dojo.patch({ dojoId }).set({ locations }).go();
  return ok(locations.find((l) => l.locationId === locationId));
};
