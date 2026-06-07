import {
  CognitoUser,
  CognitoUserPool,
  AuthenticationDetails,
} from "amazon-cognito-identity-js";

const Pool = new CognitoUserPool({
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID as string,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID as string,
});

export function initiateAuth(email: string): Promise<CognitoUser> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool });
    const authDetails = new AuthenticationDetails({ Username: email });
    user.initiateAuth(authDetails, {
      onSuccess: () => resolve(user),
      onFailure: reject,
      customChallenge: () => resolve(user),
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
