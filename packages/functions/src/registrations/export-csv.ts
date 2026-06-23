import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoCoach } from "@coderdojo/core";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";

const s3 = new S3Client({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const eventResult = await db.entities.event.query.byId({ eventId }).go();
  const ev = eventResult.data[0];
  if (!ev) return err("Event not found", 404);

  const allowed = await requireDojoCoach(db, claims.sub, ev.dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const result = await db.entities.registration.query.byEvent({ eventId })
    .where(({ status }, op) => op.ne(status, "cancelled"))
    .go();

  const headers = [
    "registrationId", "childId", "status", "ninjaName", "ninjaBirthdate", "ninjaGender",
    "parentName", "parentEmail", "parentPhone", "registeredByUserId", "atelierId",
    "needsComputer", "previousVisits", "heardAbout", "consentPhotos", "consentContact",
    "isCoachChild", "customAnswers", "checkedIn", "checkedInAt",
  ];

  const rows = result.data.map((r) =>
    headers.map((h) => {
      const val = (r as Record<string, unknown>)[h];
      if (val === undefined || val === null) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const key = `exports/${eventId}-${Date.now()}.csv`;

  await s3.send(new PutObjectCommand({
    Bucket: Resource.ExportBucket.name,
    Key: key,
    Body: csv,
    ContentType: "text/csv",
  }));

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: Resource.ExportBucket.name, Key: key }),
    { expiresIn: 300 }
  );

  return ok({ url });
};
