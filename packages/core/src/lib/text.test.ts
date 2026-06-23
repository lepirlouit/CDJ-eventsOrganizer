import { describe, it, expect } from "vitest";
import { normalizeName, namesMatch } from "./text.js";

describe("normalizeName", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeName("  John   Doe ")).toBe("john doe");
    expect(normalizeName("ALICE")).toBe("alice");
  });
});

describe("namesMatch", () => {
  it("matches names ignoring case and extra whitespace", () => {
    expect(namesMatch("John Doe", "  john   doe ")).toBe(true);
    expect(namesMatch("Marie Curie", "MARIE CURIE")).toBe(true);
  });

  it("does not match distinct names", () => {
    expect(namesMatch("John Doe", "Jane Doe")).toBe(false);
    expect(namesMatch("Anna", "Annabelle")).toBe(false);
  });
});
