import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { childId } = event.pathParameters ?? {};
  if (!childId) return err("Missing childId", 400);

  const result = await db.entities.registration.query.byChild({ childId }).go();
  const regs = result.data;
  if (regs.length === 0) return ok([]);

  // Authorize per distinct dojo; return only rows from dojos where the caller
  // is a coach/lead_coach (so a coach never sees another dojo's data).
  const dojoIds = [...new Set(regs.map((r) => r.dojoId))];
  const allowed = new Set<string>();
  await Promise.all(
    dojoIds.map(async (dojoId) => {
      if (await requireDojoCoach(db, claims.sub, dojoId, claims)) allowed.add(dojoId);
    })
  );
  if (allowed.size === 0) return err("Forbidden", 403);

  return ok(regs.filter((r) => allowed.has(r.dojoId)));
};
