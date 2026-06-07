import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);

  const userResult = await db.entities.user.query.byEmail({ email: claims.email }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  const { name, phone, preferredLang } = body;

  await db.entities.user.patch({ userId: user.userId })
    .set({
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(preferredLang !== undefined && { preferredLang }),
    })
    .go();

  const updated = await db.entities.user.query.byId({ userId: user.userId }).go();
  return ok(updated.data[0]);
};
