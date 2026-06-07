import type { CreateAuthChallengeTriggerHandler } from "aws-lambda";
import { createHmac, randomInt } from "crypto";
import { sendEmail, otpEmail } from "@coderdojo/core";

const HMAC_SECRET = process.env.OTP_HMAC_SECRET ?? "dev-secret-change-in-prod";

function hmacOtp(otp: string): string {
  return createHmac("sha256", HMAC_SECRET).update(otp).digest("hex");
}

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  const otp = String(randomInt(100000, 999999));

  // When userNotFound=true, Cognito passes a random UUID as userName and
  // forwards no userAttributes/clientMetadata — we must not send an email.
  // The challenge will fail at VerifyAuthChallenge, preventing enumeration.
  if (event.request.userNotFound) {
    event.response.publicChallengeParameters = {};
    event.response.privateChallengeParameters = { otpHash: hmacOtp(otp) };
    event.response.challengeMetadata = "OTP";
    return event;
  }

  const lang = (event.request.userAttributes["custom:preferredLang"] as "en" | "fr" | "nl") ?? "en";
  const email = event.request.userAttributes.email ?? event.userName;

  const template = otpEmail(lang, otp);

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  }).catch((e) => console.error("Failed to send OTP email", e));

  event.response.publicChallengeParameters = { email };
  event.response.privateChallengeParameters = { otpHash: hmacOtp(otp) };
  event.response.challengeMetadata = "OTP";

  return event;
};
