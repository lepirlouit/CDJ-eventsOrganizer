import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@coderdojo/core";
import { Resource } from "sst";

function hmac(value: string): string {
  return createHmac("sha256", Resource.OtpHmacSecret.value).update(value).digest("hex");
}

function hashesEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "hex");
  const bBuf = Buffer.from(b, "hex");
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const { otpHash, magicHash } = event.request.privateChallengeParameters;
  const actual = hmac(event.request.challengeAnswer);

  // The answer may be either the typed 6-digit code or the magic-link token.
  const match =
    (otpHash && hashesEqual(otpHash, actual)) ||
    (magicHash && hashesEqual(magicHash, actual));

  event.response.answerCorrect = Boolean(match);

  // Single use: once the code/link is accepted, delete the token so it can't
  // be replayed. (Best-effort — a failure here just leaves it to TTL cleanup.)
  if (match) {
    const email = event.request.userAttributes.email;
    if (email) {
      await db.entities.loginToken
        .delete({ email })
        .go()
        .catch((e) => console.error("Failed to delete consumed login token", e));
    }
  }

  return event;
};
