import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);

  const userResult = await db.entities.user.query.byEmail({ email: claims.email }).go();
  const user = userResult.data[0];
  if (!user) return err("User not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  const {
    name, phone, preferredLang,
    parentName, parentPhone, heardAbout,
    consentPhotos, consentContact, savedChildren,
  } = body;

  const updates: Record<string, unknown> = {};
  if (name !== undefined)           updates.name = name;
  if (phone !== undefined)          updates.phone = phone;
  if (preferredLang !== undefined)  updates.preferredLang = preferredLang;
  if (parentName !== undefined)     updates.parentName = parentName;
  if (parentPhone !== undefined)    updates.parentPhone = parentPhone;
  if (heardAbout !== undefined)     updates.heardAbout = heardAbout;
  if (consentPhotos !== undefined)  updates.consentPhotos = consentPhotos;
  if (consentContact !== undefined) updates.consentContact = consentContact;
  if (savedChildren !== undefined)  updates.savedChildren = savedChildren;

  await db.entities.user.patch({ userId: user.userId })
    .set(updates as any)
    .go();

  const updated = await db.entities.user.query.byId({ userId: user.userId }).go();
  return ok(updated.data[0]);
};
