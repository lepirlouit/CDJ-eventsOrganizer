import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, requireDojoLeadCoach } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { role, email } = body;
  if (!["coach", "lead_coach"].includes(role)) return err("role must be coach or lead_coach", 400);
  if (!email) return err("email required", 400);

  // Only super_admin or lead_coach of the dojo can add members
  if (!isSuperAdmin(claims)) {
    const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
    if (!allowed) return err("Forbidden", 403);
  }

  // Look up the target user by email to get their DynamoDB ULID userId
  const userResult = await db.entities.user.query.byEmail({ email }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found — they must log in at least once first", 404);

  await db.entities.dojoMembership.put({ userId: user.userId, dojoId, role }).go();

  return ok({ userId: user.userId, email: user.email, name: user.name, dojoId, role }, 201);
};
