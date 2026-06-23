import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

const TYPES = ["text", "select", "checkbox"];

// Lead-coach: update a dojo's custom question.
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, questionId } = event.pathParameters ?? {};
  if (!dojoId || !questionId) return err("Missing dojoId or questionId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const existing = await db.entities.customQuestion.get({ dojoId, questionId }).go();
  if (!existing.data) return err("Question not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  const { label, type, options, required, order, active } = body;
  if (type !== undefined && !TYPES.includes(type)) return err("invalid question type", 400);

  const updates: Record<string, unknown> = {};
  if (label !== undefined)    updates.label = label;
  if (type !== undefined)     updates.type = type;
  if (options !== undefined)  updates.options = options;
  if (required !== undefined) updates.required = required;
  if (order !== undefined)    updates.order = order;
  if (active !== undefined)   updates.active = active;

  await db.entities.customQuestion.patch({ dojoId, questionId }).set(updates as any).go();

  const updated = await db.entities.customQuestion.get({ dojoId, questionId }).go();
  return ok(updated.data);
};
