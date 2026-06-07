import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";
import { createHmac, timingSafeEqual } from "crypto";

const HMAC_SECRET = process.env.OTP_HMAC_SECRET ?? "dev-secret-change-in-prod";

function hmacOtp(otp: string): string {
  return createHmac("sha256", HMAC_SECRET).update(otp).digest("hex");
}

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expected = event.request.privateChallengeParameters.otpHash;
  const actual = hmacOtp(event.request.challengeAnswer);

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(actual, "hex");

  const match =
    expectedBuf.length === actualBuf.length &&
    timingSafeEqual(expectedBuf, actualBuf);

  event.response.answerCorrect = match;
  return event;
};
