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

  const body = JSON.parse(event.body ?? "{}");
  const { name, birthdate, previousVisits, notes } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined)           updates.name = name;
  if (birthdate !== undefined)      updates.birthdate = birthdate;
  if (previousVisits !== undefined) updates.previousVisits = previousVisits;
  if (notes !== undefined)          updates.notes = notes;

  await db.entities.child.patch({ childId }).set(updates as any).go();

  const updated = await db.entities.child.query.byId({ childId }).go();
  return ok(updated.data[0]);
};
