import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";
import { ulid } from "ulid";

const TYPES = ["text", "select", "checkbox"];

// Lead-coach: create a custom registration question for a dojo.
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const body = JSON.parse(event.body ?? "{}");
  const { label, type, options, required, order, active } = body;
  if (!label) return err("label required", 400);
  if (type && !TYPES.includes(type)) return err("invalid question type", 400);

  const questionId = ulid();
  await db.entities.customQuestion.put({
    questionId,
    dojoId,
    label,
    type: type ?? "text",
    ...(Array.isArray(options) && { options }),
    required: required ?? false,
    order: order ?? 0,
    active: active ?? true,
  }).go();

  const created = await db.entities.customQuestion.get({ dojoId, questionId }).go();
  return ok(created.data, 201);
};
