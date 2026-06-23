// Small, dependency-free text helpers shared by handlers and the frontend rule
// mirror. Kept pure so they are trivially unit-testable.

/** Lowercase, trim, and collapse internal whitespace for case-insensitive compare. */
export function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when two names are equal ignoring case and surrounding/extra whitespace. */
export function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}
