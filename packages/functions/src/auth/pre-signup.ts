import type { PreSignUpTriggerHandler } from "aws-lambda";

// Auto-confirm and auto-verify every new sign-up so the user can
// immediately authenticate via the CUSTOM_AUTH (OTP) flow without
// a separate email-confirmation step.
export const handler: PreSignUpTriggerHandler = async (event) => {
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  return event;
};
