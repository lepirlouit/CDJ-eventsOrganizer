import type { PreSignUpTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient({});

// Auto-confirm and auto-verify every sign-up so users can immediately
// authenticate via the CUSTOM_AUTH (OTP) flow.
// Also update custom:lang for returning users — clientMetadata from
// InitiateAuth is not forwarded to CreateAuthChallenge by Cognito, but
// userAttributes IS. We relay the lang via this admin update so
// CreateAuthChallenge can read the current language preference.
export const handler: PreSignUpTriggerHandler = async (event) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  const lang = event.request.userAttributes["custom:lang"];
  const email = event.request.userAttributes.email;
  if (lang && email) {
    // Best-effort: a failure here only means the OTP email may use the
    // previous language. Log it so auth-flow regressions stay visible
    // instead of being silently swallowed.
    await cognito.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: event.userPoolId,
      Username: email,
      UserAttributes: [{ Name: "custom:lang", Value: lang }],
    })).catch((e) => console.error("Failed to update custom:lang for", email, e));
  }

  return event;
};
