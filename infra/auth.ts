import { table } from "./storage";
import { emailIdentity } from "./email";

const defineAuthChallenge = new sst.aws.Function(`DefineAuthChallenge`, {
  handler: "packages/functions/src/auth/define-auth-challenge.handler",
  link: [table],
});

const createAuthChallenge = new sst.aws.Function(`CreateAuthChallenge`, {
  handler: "packages/functions/src/auth/create-auth-challenge.handler",
  link: [table, emailIdentity],
  environment: {
    SES_FROM_EMAIL: "noreply@events.coderdojo.be",
  },
});

const verifyAuthChallenge = new sst.aws.Function(`VerifyAuthChallenge`, {
  handler: "packages/functions/src/auth/verify-auth-challenge.handler",
  link: [table],
});

const postConfirmation = new sst.aws.Function(`PostConfirmation`, {
  handler: "packages/functions/src/auth/post-confirmation.handler",
  link: [table],
});

export const userPool = new aws.cognito.UserPool(`UserPool`, {
  name: `coderdojo-${$app.stage}-users`,
  deletionProtection: $app.stage === "prod" ? "ACTIVE" : "INACTIVE",
  usernameAttributes: ["email"],
  schemas: [
    { name: "role", attributeDataType: "String", mutable: true },
  ],
  lambdaConfig: {
    defineAuthChallenge: defineAuthChallenge.arn,
    createAuthChallenge: createAuthChallenge.arn,
    verifyAuthChallengeResponse: verifyAuthChallenge.arn,
    postConfirmation: postConfirmation.arn,
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
  explicitAuthFlows: ["ALLOW_CUSTOM_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"],
  generateSecret: false,
  preventUserExistenceErrors: "ENABLED",
});

// Grant Cognito permission to invoke the Lambda triggers
for (const [name, fn] of [
  ["DefineAuthChallenge", defineAuthChallenge],
  ["CreateAuthChallenge", createAuthChallenge],
  ["VerifyAuthChallenge", verifyAuthChallenge],
  ["PostConfirmation",    postConfirmation],
] as const) {
  new aws.lambda.Permission(`${name}CognitoPermission`, {
    action: "lambda:InvokeFunction",
    function: fn.arn,
    principal: "cognito-idp.amazonaws.com",
    sourceArn: userPool.arn,
  });
}
