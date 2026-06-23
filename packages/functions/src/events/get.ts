import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err } from "@coderdojo/core";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const { eventId } = event.pathParameters ?? {};
  if (!eventId) return err("Missing eventId", 400);

  const result = await db.entities.event.query.byId({ eventId }).go();
  const ev = result.data[0];
  if (!ev) return err("Event not found", 404);

  // Confirmed registrations per atelier — lets the form disable full tracks.
  const regs = await db.entities.registration.query
    .byEvent({ eventId })
    .where(({ status }, op) => op.eq(status, "confirmed"))
    .go();
  const atelierCounts: Record<string, number> = {};
  for (const r of regs.data) {
    atelierCounts[r.atelierId] = (atelierCounts[r.atelierId] ?? 0) + 1;
  }

  return ok({ ...ev, atelierCounts });
};
