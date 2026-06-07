import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin } from "@coderdojo/core";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Resource } from "sst";

const cognito = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isSuperAdmin(claims)) return err("Forbidden", 403);

  const { userId } = event.pathParameters ?? {};
  if (!userId) return err("Missing userId", 400);

  const body = JSON.parse(event.body ?? "{}");
  const { role } = body;

  // Only global roles can be set here; dojo roles go through /members endpoints
  if (!["parent", "super_admin"].includes(role)) {
    return err("role must be parent or super_admin. Use /admin/dojos/{dojoId}/members/{userId} for dojo roles.", 400);
  }

  const userResult = await db.entities.user.query.byId({ userId }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found", 404);

  await db.entities.user.patch({ userId }).set({ role }).go();

  if (user.cognitoSub) {
    await cognito.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: Resource.UserPool.id,
        Username: user.cognitoSub,
        UserAttributes: [{ Name: "custom:role", Value: role }],
      })
    );
  }

  const updated = await db.entities.user.query.byId({ userId }).go();
  return ok(updated.data[0]);
};
