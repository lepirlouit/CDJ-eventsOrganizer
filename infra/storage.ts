export const table = new sst.aws.Dynamo(`MainTable`, {
  fields: {
    pk: "string",
    sk: "string",
    gsi1pk: "string",
    gsi1sk: "string",
    gsi2pk: "string",
    gsi2sk: "string",
    gsi3pk: "string",
    gsi3sk: "string",
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
  globalIndexes: {
    gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
    gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
    gsi3: { hashKey: "gsi3pk", rangeKey: "gsi3sk" },
  },
  // Single-use magic-link / OTP login tokens expire themselves via DynamoDB TTL.
  // (Code also checks expiresAt, since TTL deletion is best-effort and delayed.)
  ttl: "expiresAt",
  transform: {
    table: {
      name: `coderdojo-${$app.stage}-main`,
      billingMode: "PAY_PER_REQUEST",
    },
  },
});

export const exportBucket = new sst.aws.Bucket(`ExportBucket`, {
  transform: {
    bucket: { bucketName: `coderdojo-${$app.stage}-exports` },
  },
});
