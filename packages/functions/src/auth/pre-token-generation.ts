import type { PreTokenGenerationTriggerHandler } from "aws-lambda";
import { db } from "@coderdojo/core";

// Fires before Cognito signs the JWT. Injects the user's role from DynamoDB
// so that custom:role reflects the DB value (e.g. "super_admin") even if the
// Cognito user attribute was never explicitly set.
export const handler: PreTokenGenerationTriggerHandler = async (event) => {
  const email = event.request.userAttributes.email;
  if (!email) return event;

  const result = await db.entities.user.query.byEmail({ email }).go();
  const role = result.data[0]?.role ?? "parent";

  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: { "custom:role": role },
  };

  return event;
};
