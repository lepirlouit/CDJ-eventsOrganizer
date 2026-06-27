import { table } from "./storage";

// HMAC key for OTP integrity. Set per stage with:
//   npx sst secret set OtpHmacSecret <value> --stage <stage>
// Deploy fails loudly if it is unset — there is no insecure fallback.
const otpHmacSecret = new sst.Secret("OtpHmacSecret");

const preSignUp = new sst.aws.Function(`PreSignUp`, {
  handler: "packages/functions/src/auth/pre-signup.handler",
  link: [table],
});

const defineAuthChallenge = new sst.aws.Function(`DefineAuthChallenge`, {
  handler: "packages/functions/src/auth/define-auth-challenge.handler",
  link: [table],
});

// Base URL of the web app, used to build the magic link in the login email.
const WEB_URL = $app.stage === "prod"
  ? "https://cdj.pirlou.it"
  : "http://localhost:5173";

const createAuthChallenge = new sst.aws.Function(`CreateAuthChallenge`, {
  handler: "packages/functions/src/auth/create-auth-challenge.handler",
  link: [table, otpHmacSecret],
  environment: {
    SES_FROM_EMAIL: "noreply@cdj.pirlou.it",
    WEB_URL,
  },
});

// link: [emailIdentity] only shares properties, it doesn't grant IAM access.
// Attach an inline policy so the Lambda can call ses:SendEmail.
new aws.iam.RolePolicy(`CreateAuthChallengeSesPolicy`, {
  role: createAuthChallenge.nodes.role.name,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "ses:SendRawEmail"],
        Resource: "*",
      },
    ],
  }),
});

const verifyAuthChallenge = new sst.aws.Function(`VerifyAuthChallenge`, {
  handler: "packages/functions/src/auth/verify-auth-challenge.handler",
  link: [table, otpHmacSecret],
});

const postConfirmation = new sst.aws.Function(`PostConfirmation`, {
  handler: "packages/functions/src/auth/post-confirmation.handler",
  link: [table],
});

const preTokenGeneration = new sst.aws.Function(`PreTokenGeneration`, {
  handler: "packages/functions/src/auth/pre-token-generation.handler",
  link: [table],
});

export const userPool = new aws.cognito.UserPool(`UserPool`, {
  name: `coderdojo-${$app.stage}-users`,
  deletionProtection: $app.stage === "prod" ? "ACTIVE" : "INACTIVE",
  usernameAttributes: ["email"],
  schemas: [
    { name: "role", attributeDataType: "String", mutable: true },
    { name: "lang", attributeDataType: "String", mutable: true },
  ],
  lambdaConfig: {
    preSignUp: preSignUp.arn,
    defineAuthChallenge: defineAuthChallenge.arn,
    createAuthChallenge: createAuthChallenge.arn,
    verifyAuthChallengeResponse: verifyAuthChallenge.arn,
    postConfirmation: postConfirmation.arn,
    preTokenGeneration: preTokenGeneration.arn,
  },
  passwordPolicy: {
    minimumLength: 8,
    requireLowercase: false,
    requireNumbers: false,
    requireSymbols: false,
    requireUppercase: false,
  },
});

export const userPoolClient = new aws.cognito.UserPoolClient(`UserPoolClient`, {
  name: `coderdojo-${$app.stage}-client`,
  userPoolId: userPool.id,
  explicitAuthFlows: [
    "ALLOW_CUSTOM_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",  // needed for signUp confirmation flow
  ],
  generateSecret: false,
  preventUserExistenceErrors: "ENABLED",
});

// Allow PreSignUp to update user attributes for returning users
new aws.iam.RolePolicy(`PreSignUpCognitoPolicy`, {
  role: preSignUp.nodes.role.name,
  policy: $interpolate`{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "cognito-idp:AdminUpdateUserAttributes",
      "Resource": "${userPool.arn}"
    }]
  }`,
});

// Grant Cognito permission to invoke all Lambda triggers
for (const [name, fn] of [
  ["PreSignUp",            preSignUp],
  ["DefineAuthChallenge",  defineAuthChallenge],
  ["CreateAuthChallenge",  createAuthChallenge],
  ["VerifyAuthChallenge",  verifyAuthChallenge],
  ["PostConfirmation",     postConfirmation],
  ["PreTokenGeneration",   preTokenGeneration],
] as const) {
  new aws.lambda.Permission(`${name}CognitoPermission`, {
    action: "lambda:InvokeFunction",
    function: fn.arn,
    principal: "cognito-idp.amazonaws.com",
    sourceArn: userPool.arn,
  });
}
