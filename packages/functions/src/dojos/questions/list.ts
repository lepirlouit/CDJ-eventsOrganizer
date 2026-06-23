import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err } from "@coderdojo/core";

// Public: returns a dojo's custom questions (sorted by `order`) so the
// registration form can render the active ones and the admin UI can manage all.
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const result = await db.entities.customQuestion.query.byDojo({ dojoId }).go();
  const questions = result.data.sort((a, b) => a.order - b.order);

  return ok(questions);
};
