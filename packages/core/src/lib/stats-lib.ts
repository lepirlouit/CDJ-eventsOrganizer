// Pure aggregation helpers for super-admin statistics. No DB access so they can
// be unit-tested directly.

export type GenderKey = "boy" | "girl" | "other" | "prefer_not_to_say" | "unknown";

export const GENDER_KEYS: GenderKey[] = ["boy", "girl", "other", "prefer_not_to_say", "unknown"];

export function emptyGenderBreakdown(): Record<GenderKey, number> {
  return { boy: 0, girl: 0, other: 0, prefer_not_to_say: 0, unknown: 0 };
}

/**
 * Counts registrations by the child's gender. A missing/unrecognized gender
 * counts as "unknown" (legacy rows registered before the field existed).
 */
export function genderBreakdown(
  registrations: { ninjaGender?: string | null }[]
): Record<GenderKey, number> {
  const breakdown = emptyGenderBreakdown();
  for (const r of registrations) {
    const g = r.ninjaGender as GenderKey;
    if (g && GENDER_KEYS.includes(g) && g !== "unknown") breakdown[g] += 1;
    else breakdown.unknown += 1;
  }
  return breakdown;
}
