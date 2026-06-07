import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, userId } = event.pathParameters ?? {};
  if (!dojoId || !userId) return err("Missing dojoId or userId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { role } = body;
  if (!["coach", "lead_coach"].includes(role)) return err("role must be coach or lead_coach", 400);

  if (!isSuperAdmin(claims)) {
    const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
    if (!allowed) return err("Forbidden", 403);
  }

  const existing = await db.entities.dojoMembership.get({ userId, dojoId }).go();
  if (!existing.data) return err("Membership not found", 404);

  await db.entities.dojoMembership.patch({ userId, dojoId }).set({ role }).go();
  return ok({ userId, dojoId, role });
};
