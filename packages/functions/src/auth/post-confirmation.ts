import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { db } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { sub, email } = event.request.userAttributes;
  const name = event.request.userAttributes.name ?? email.split("@")[0];

  const existing = await db.entities.user.query.byEmail({ email }).go();
  if (existing.data.length > 0) return event;

  await db.entities.user.put({
    userId: ulid(),
    cognitoSub: sub,
    email,
    name,
    role: "parent",
    preferredLang: "en",
  }).go();

  return event;
};
