import { describe, it, expect } from "vitest";
import { genderBreakdown, emptyGenderBreakdown } from "./stats-lib.js";

describe("genderBreakdown", () => {
  it("counts each known gender", () => {
    const result = genderBreakdown([
      { ninjaGender: "boy" },
      { ninjaGender: "boy" },
      { ninjaGender: "girl" },
      { ninjaGender: "other" },
      { ninjaGender: "prefer_not_to_say" },
    ]);
    expect(result).toEqual({ boy: 2, girl: 1, other: 1, prefer_not_to_say: 1, unknown: 0 });
  });

  it("counts missing or unrecognized gender as unknown", () => {
    const result = genderBreakdown([
      { ninjaGender: undefined },
      { ninjaGender: null },
      {},
      { ninjaGender: "martian" },
    ]);
    expect(result.unknown).toBe(4);
  });

  it("returns an all-zero breakdown for no registrations", () => {
    expect(genderBreakdown([])).toEqual(emptyGenderBreakdown());
  });
});
