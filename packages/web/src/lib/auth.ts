import {
  CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const Pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
});

// CognitoUser cannot be serialized (structured-clone fails), so we hold it
// in a module-level variable instead of passing it through router state.
let _pendingUser: CognitoUser | null = null;
export const getPendingUser = () => _pendingUser;
export const clearPendingUser = () => { _pendingUser = null; };

/**
 * Silently create the Cognito user if they don't exist yet.
 * The PreSignUp Lambda auto-confirms them, so no verification step needed.
 * If the user already exists, UsernameExistsException is swallowed.
 */
function ensureUserExists(email: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    // The password is never used for authentication (CUSTOM_AUTH only).
    // It just satisfies the Cognito signUp API requirement.
    const dummyPassword = `Cdj-${btoa(email).slice(0, 16)}`;
    // Pass lang as a user attribute so PreSignUp can relay it for returning
    // users via adminUpdateUserAttributes — Cognito doesn't forward clientMetadata
    // to CreateAuthChallenge, but userAttributes ARE available there.
    const attrs = [new CognitoUserAttribute({ Name: "custom:lang", Value: lang })];
    Pool.signUp(email, dummyPassword, attrs, [], (err) => {
      // Ignore "user already exists" — that is the happy path for returning users
      if (err && err.name !== "UsernameExistsException") {
        console.warn("SignUp warning:", err.message);
      }
      resolve(); // always resolve — initiateAuth is the source of truth
    });
  });
}

export async function initiateAuth(email: string, langHint = "en"): Promise<CognitoUser> {
  // Normalise "fr-BE" → "fr" etc.; fall back to "en" for unknown codes.
  const base = langHint.split("-")[0];
  const lang = base === "fr" || base === "nl" ? base : "en";

  // Ensure the user exists in Cognito before starting the custom auth flow.
  // Without this, preventUserExistenceErrors causes Cognito to pass a random
  // UUID as event.userName in CreateAuthChallenge, making SES fail.
  await ensureUserExists(email, lang);

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      ClientMetadata: { lang },
    });
    user.initiateAuth(authDetails, {
      onSuccess: () => { _pendingUser = user; resolve(user); },
      onFailure: reject,
      customChallenge: () => { _pendingUser = user; resolve(user); },
    });
  });
}

/**
 * Redeem a magic-link token (or a manually-typed code) with no pre-existing
 * pending session — e.g. when the link is opened on another device or in a
 * fresh tab. Starts a brand-new CUSTOM_AUTH challenge for the email and answers
 * it immediately. The CreateAuthChallenge Lambda is idempotent, so this reuses
 * the secrets already emailed instead of sending a new code.
 */
export async function redeemMagicLink(
  email: string,
  token: string,
  langHint = "en"
): Promise<{ accessToken: string; idToken: string }> {
  const user = await initiateAuth(email, langHint);
  return answerChallenge(user, token);
}

export function answerChallenge(
  user: CognitoUser,
  otp: string
): Promise<{ accessToken: string; idToken: string }> {
  return new Promise((resolve, reject) => {
    user.sendCustomChallengeAnswer(otp, {
      onSuccess: (session) => {
        resolve({
          accessToken: session.getAccessToken().getJwtToken(),
          idToken: session.getIdToken().getJwtToken(),
        });
      },
      onFailure: reject,
      customChallenge: () => reject(new Error("Invalid code")),
    });
  });
}
