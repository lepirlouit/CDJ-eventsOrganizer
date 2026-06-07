import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Resource } from "sst";

const cognito = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (claims["custom:role"] !== "super_admin") return err("Forbidden", 403);

  const { userId } = event.pathParameters ?? {};
  if (!userId) return err("Missing userId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { role, dojoId } = body;

  if (!["parent", "coach", "lead_coach", "super_admin"].includes(role)) {
    return err("Invalid role", 400);
  }

  const userResult = await db.entities.user.query.byId({ userId }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found", 404);

  await db.entities.user.patch({ userId })
    .set({ role, ...(dojoId !== undefined && { dojoId }) })
    .go();

  if (user.cognitoSub) {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: Resource.UserPool.id,
        Username: user.cognitoSub,
        UserAttributes: [
          { Name: "custom:role", Value: role },
          ...(dojoId !== undefined
            ? [{ Name: "custom:dojoId", Value: dojoId }]
            : []),
        ],
      })
    );
  }

  const updated = await db.entities.user.query.byId({ userId }).go();
  return ok(updated.data[0]);
};
