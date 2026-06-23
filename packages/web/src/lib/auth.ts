import {
  CognitoUser,
  CognitoUserPool,
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
function ensureUserExists(email: string): Promise<void> {
  return new Promise((resolve) => {
    // The password is never used for authentication (CUSTOM_AUTH only).
    // It just satisfies the Cognito signUp API requirement.
    const dummyPassword = `Cdj-${btoa(email).slice(0, 16)}`;
    Pool.signUp(email, dummyPassword, [], [], (err) => {
      // Ignore "user already exists" — that is the happy path for returning users
      if (err && err.name !== "UsernameExistsException") {
        console.warn("SignUp warning:", err.message);
      }
      resolve(); // always resolve — initiateAuth is the source of truth
    });
  });
}

export async function initiateAuth(email: string): Promise<CognitoUser> {
  // Ensure the user exists in Cognito before starting the custom auth flow.
  // Without this, preventUserExistenceErrors causes Cognito to pass a random
  // UUID as event.userName in CreateAuthChallenge, making SES fail.
  await ensureUserExists(email);

  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool });
    const lang = localStorage.getItem("cdj-lang") ?? "en";
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
