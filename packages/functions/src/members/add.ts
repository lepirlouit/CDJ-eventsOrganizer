import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, userId } = event.pathParameters ?? {};
  if (!dojoId || !userId) return err("Missing dojoId or userId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { role } = body;
  if (!["coach", "lead_coach"].includes(role)) return err("role must be coach or lead_coach", 400);

  // Only super_admin or lead_coach of the dojo can add members
  if (!isSuperAdmin(claims)) {
    const callerUserId = claims.sub;
    const allowed = await requireDojoLeadCoach(db, callerUserId, dojoId, claims);
    if (!allowed) return err("Forbidden", 403);
  }

  const userResult = await db.entities.user.query.byId({ userId }).go();
  if (!userResult.data[0]) return err("User not found", 404);

  await db.entities.dojoMembership.put({ userId, dojoId, role }).go();

  return ok({ userId, dojoId, role }, 201);
};
