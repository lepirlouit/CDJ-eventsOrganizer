import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { Resource } from "sst";

const cognito = new CognitoIdentityProviderClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const cookie = event.cookies?.find((c) => c.startsWith("refreshToken="));
  if (!cookie) {
    return { statusCode: 401, body: JSON.stringify({ error: "No session" }) };
  }
  const refreshToken = cookie.split("=").slice(1).join("=");

  try {
    const result = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: Resource.UserPoolClient.id,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: result.AuthenticationResult?.AccessToken,
        idToken: result.AuthenticationResult?.IdToken,
      }),
    };
  } catch {
    return { statusCode: 401, body: JSON.stringify({ error: "Session expired" }) };
  }
};
