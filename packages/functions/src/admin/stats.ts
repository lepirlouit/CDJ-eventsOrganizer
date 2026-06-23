import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { db, ok, err, getClaims, isSuperAdmin, genderBreakdown, emptyGenderBreakdown, GENDER_KEYS } from "@coderdojo/core";

/**
 * Super-admin only. Aggregates confirmed (non-cancelled) registrations by the
 * child's gender, both globally and per dojo. Gender is read from the
 * registration's stamped `ninjaGender`; legacy rows without it count as "unknown".
 */
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const claims = getClaims(event as any);
  if (!isSuperAdmin(claims)) return err("Forbidden", 403);

  const dojosResult = await db.entities.dojo.query.allDojos({}).go();
  const dojos = dojosResult.data;

  const global = emptyGenderBreakdown();
  const perDojo: { dojoId: string; name: string; total: number; breakdown: Record<string, number> }[] = [];

  for (const dojo of dojos) {
    const regResult = await db.entities.registration.query
      .byDojo({ dojoId: dojo.dojoId })
      .where(({ status }, op) => op.ne(status, "cancelled"))
      .go();

    const breakdown = genderBreakdown(regResult.data);
    for (const k of GENDER_KEYS) global[k] += breakdown[k];
    perDojo.push({
      dojoId: dojo.dojoId,
      name: dojo.name,
      total: regResult.data.length,
      breakdown,
    });
  }

  const total = Object.values(global).reduce((a, b) => a + b, 0);
  return ok({ total, global, perDojo });
};
