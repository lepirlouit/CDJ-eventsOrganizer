import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { childId } = event.pathParameters ?? {};
  if (!childId) return err("Missing childId", 400);

  const existing = await db.entities.child.query.byId({ childId }).go();
  const child = existing.data[0];
  if (!child) return err("Child not found", 404);
  if (child.userId !== claims.sub) return err("Forbidden", 403);

  // Delete the profile only. Past registrations keep their denormalized
  // ninjaName/ninjaBirthdate + childId so history stays readable.
  await db.entities.child.delete({ childId }).go();
  return ok({ deleted: true });
};
