import type { CreateAuthChallengeTriggerHandler } from "aws-lambda";
import { createHmac, randomInt, randomBytes } from "crypto";
import { sendEmail, magicLinkEmail, db } from "@coderdojo/core";
import { Resource } from "sst";

// Login secrets are valid for 15 minutes (also enforced by DynamoDB TTL).
const TTL_SECONDS = 15 * 60;

function hmac(value: string): string {
  return createHmac("sha256", Resource.OtpHmacSecret.value).update(value).digest("hex");
}

// A pair of hashes that nothing the user holds can match — used to make a
// challenge dead-end cleanly (user-not-found, or a replayed/expired link).
function deadEndParams(): { otpHash: string; magicHash: string } {
  return {
    otpHash: hmac(randomBytes(16).toString("hex")),
    magicHash: hmac(randomBytes(16).toString("hex")),
  };
}

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  // When userNotFound=true, Cognito passes a random UUID as userName and
  // forwards no userAttributes — we must not send an email. The challenge will
  // fail at VerifyAuthChallenge, preventing account enumeration.
  if (event.request.userNotFound) {
    event.response.publicChallengeParameters = {};
    event.response.privateChallengeParameters = deadEndParams();
    event.response.challengeMetadata = "MAGIC_LINK";
    return event;
  }

  // clientMetadata from InitiateAuth is NOT forwarded by Cognito when
  // preventUserExistenceErrors is enabled. Read lang from userAttributes —
  // PreSignUp stores it there via adminUpdateUserAttributes on each login.
  const rawLang = event.request.userAttributes["custom:lang"] ?? "en";
  const lang: "en" | "fr" | "nl" = rawLang === "fr" ? "fr" : rawLang === "nl" ? "nl" : "en";
  const email = event.request.userAttributes.email ?? event.userName;

  const now = Math.floor(Date.now() / 1000);

  // Idempotency: the magic link is redeemed with a *fresh* initiateAuth (often
  // on another device), which fires this trigger again — as does each retry in
  // a multi-attempt session. If a valid token already exists for this email,
  // reuse its hashes so the original code/link still works, and DON'T re-send
  // an email. A consumed link is deleted by VerifyAuthChallenge, so a missing
  // record here always means "start a brand-new login".
  const existing = await db.entities.loginToken
    .get({ email })
    .go()
    .then((r) => r.data)
    .catch((e) => {
      console.error("Failed to read login token", e);
      return null;
    });

  if (existing && existing.expiresAt > now) {
    event.response.publicChallengeParameters = { email };
    event.response.privateChallengeParameters = {
      otpHash: existing.otpHash,
      magicHash: existing.magicHash,
    };
    event.response.challengeMetadata = "MAGIC_LINK";
    return event;
  }

  // Fresh login: mint a typeable 6-digit code AND a high-entropy magic token,
  // persist their hashes, and email both (link + code fallback).
  const otp = String(randomInt(100000, 999999));
  const magicToken = randomBytes(32).toString("base64url");
  const otpHash = hmac(otp);
  const magicHash = hmac(magicToken);

  await db.entities.loginToken
    .put({ email, otpHash, magicHash, expiresAt: now + TTL_SECONDS })
    .go()
    .catch((e) => console.error("Failed to store login token", e));

  const url =
    `${process.env.WEB_URL ?? ""}/login/verify` +
    `?email=${encodeURIComponent(email)}&token=${magicToken}`;
  const template = magicLinkEmail(lang, { url, otp });

  await sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  }).catch((e) => console.error("Failed to send magic-link email", e));

  event.response.publicChallengeParameters = { email };
  event.response.privateChallengeParameters = { otpHash, magicHash };
  event.response.challengeMetadata = "MAGIC_LINK";

  return event;
};
