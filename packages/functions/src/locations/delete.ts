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

  const locations = (dojo.locations ?? []).filter((l) => l.locationId !== locationId);
  await db.entities.dojo.patch({ dojoId }).set({ locations }).go();

  return ok({ deleted: true });
};
