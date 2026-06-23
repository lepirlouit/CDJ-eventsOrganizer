import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";

// Lead-coach: delete a dojo's custom question. Past answers on registrations
// are kept as-is (they reference this questionId in their customAnswers map).
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId, questionId } = event.pathParameters ?? {};
  if (!dojoId || !questionId) return err("Missing dojoId or questionId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  await db.entities.customQuestion.delete({ dojoId, questionId }).go();
  return ok({ deleted: true, questionId });
};
