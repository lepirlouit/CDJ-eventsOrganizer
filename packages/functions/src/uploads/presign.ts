import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, getDbUserId, isSuperAdmin } from "@coderdojo/core";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import { ulid } from "ulid";

const s3 = new S3Client({});

// Extensions we allow, mapped from the declared content type. Keeps the stored key
// extension consistent with what the browser will actually serve.
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);

  // Only coaches/lead coaches author event descriptions, so gate uploads to them.
  // Super admins always pass; otherwise require at least one dojo membership.
  if (!isSuperAdmin(claims)) {
    const dbUserId = await getDbUserId(db, claims);
    if (!dbUserId) return err("Forbidden", 403);
    const memberships = await db.entities.dojoMembership.query.byUser({ userId: dbUserId }).go();
    const isCoach = memberships.data.some(
      (m) => m.role === "coach" || m.role === "lead_coach"
    );
    if (!isCoach) return err("Forbidden", 403);
  }

  const body = JSON.parse(event.body ?? "{}");
  const contentType = String(body.contentType ?? "");
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) return err("Unsupported image type", 400);

  const key = `uploads/events/${ulid()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: Resource.UploadsBucket.name,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  return ok({ uploadUrl, key });
};
