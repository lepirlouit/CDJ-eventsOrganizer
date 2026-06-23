import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims } from "@coderdojo/core";
import { ulid } from "ulid";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const body = JSON.parse(event.body ?? "{}");
  const { name, birthdate, previousVisits, notes } = body;
  if (!name || !birthdate) return err("name and birthdate are required", 400);

  const childId = ulid();
  await db.entities.child.put({
    childId,
    userId: claims.sub,
    name,
    birthdate,
    ...(previousVisits !== undefined && { previousVisits }),
    ...(notes !== undefined && { notes }),
  }).go();

  const created = await db.entities.child.query.byId({ childId }).go();
  return ok(created.data[0], 201);
};
