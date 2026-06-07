import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isLeadCoachOrAbove } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isLeadCoachOrAbove(claims["custom:role"])) return err("Forbidden", 403);

  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { waitlistMode } = body;
  if (!["auto", "manual"].includes(waitlistMode)) return err("Invalid waitlistMode", 400);

  await db.entities.dojo.patch({ dojoId }).set({ waitlistMode }).go();
  return ok({ waitlistMode });
};
