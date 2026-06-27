import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

/**
 * Short-lived, single-use login secret for the passwordless flow.
 *
 * One record per email (a new login overwrites the previous pending one).
 * It holds the HMACs of BOTH login secrets issued for a sign-in attempt:
 *   - otpHash    — the 6-digit code the user can type in the open tab
 *   - magicHash  — the high-entropy token embedded in the magic link
 *
 * CreateAuthChallenge reads this record to stay idempotent across the magic
 * link's "fresh initiateAuth" (so it reuses the same secrets and does NOT send
 * a duplicate email). VerifyAuthChallenge DELETES it on success to enforce
 * single use — deleting (rather than a "consumed" flag) keeps re-login within
 * the TTL window working, since a fresh login and a replay are indistinguishable
 * at the trigger. `expiresAt` is an epoch-second timestamp used by DynamoDB TTL.
 */
export const LoginTokenEntity = new Entity(
  {
    model: { entity: "loginToken", version: "1", service: "coderdojo" },
    attributes: {
      email: { type: "string", required: true },
      otpHash: { type: "string", required: true },
      magicHash: { type: "string", required: true },
      // Epoch SECONDS — matches the DynamoDB TTL attribute on MainTable.
      expiresAt: { type: "number", required: true },
    },
    indexes: {
      byEmail: {
        pk: { field: "pk", composite: ["email"], template: "LOGINTOKEN#${email}" },
        sk: { field: "sk", composite: [], template: "#TOKEN" },
      },
    },
  },
  { client: DocumentClient, table }
);
