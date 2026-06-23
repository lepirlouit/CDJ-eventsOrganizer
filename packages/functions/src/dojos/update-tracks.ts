import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, requireDojoLeadCoach } from "@coderdojo/core";
import { ulid } from "ulid";

/**
 * Replace a dojo's reusable track catalog. Lead-coach (or super-admin) only.
 * Body: { tracks: [{ trackId?, name, active }] } — missing trackId gets a new ULID.
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  const { dojoId } = event.pathParameters ?? {};
  if (!dojoId) return err("Missing dojoId", 400);

  const allowed = await requireDojoLeadCoach(db, claims.sub, dojoId, claims);
  if (!allowed) return err("Forbidden", 403);

  const existing = await db.entities.dojo.query.byId({ dojoId }).go();
  if (!existing.data[0]) return err("Dojo not found", 404);

  const body = JSON.parse(event.body ?? "{}");
  if (!Array.isArray(body.tracks)) return err("tracks array required", 400);

  const tracks = body.tracks.map((tr: { trackId?: string; name: string; active?: boolean }) => {
    if (!tr.name) throw Object.assign(new Error("track name required"), { statusCode: 400 });
    return { trackId: tr.trackId || ulid(), name: tr.name, active: tr.active !== false };
  });

  try {
    await db.entities.dojo.patch({ dojoId }).set({ tracks }).go();
  } catch (e: any) {
    return err(e.message, e.statusCode ?? 500);
  }

  const updated = await db.entities.dojo.query.byId({ dojoId }).go();
  return ok(updated.data[0]);
};
