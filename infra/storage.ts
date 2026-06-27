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
    // The physical-name property on aws.s3.Bucket is `bucket` (not `bucketName`).
    bucket: { bucket: `coderdojo-${$app.stage}-exports` },
  },
});

// Persistent bucket for images embedded in event descriptions. Served under the
// site's own domain via a second CloudFront origin (see infra/web.ts), so it must
// allow CloudFront to read it. CORS allows the browser's presigned PUT direct to S3.
export const uploadsBucket = new sst.aws.Bucket(`UploadsBucket`, {
  access: "cloudfront",
  cors: {
    allowMethods: ["PUT", "GET", "HEAD"],
    allowOrigins:
      $app.stage === "prod"
        ? ["https://cdj.pirlou.it"]
        : ["http://localhost:5173", "https://cdj.pirlou.it"],
    allowHeaders: ["*"],
    exposeHeaders: ["ETag"],
  },
  transform: {
    bucket: { bucket: `coderdojo-${$app.stage}-uploads` },
  },
});
