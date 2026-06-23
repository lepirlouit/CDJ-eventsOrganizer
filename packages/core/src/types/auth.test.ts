import { describe, it, expect } from "vitest";
import {
  getDojoRole,
  requireDojoCoach,
  requireDojoLeadCoach,
  requireCheckInCoach,
  type JwtClaims,
} from "./index.js";

interface MockUser { userId: string; email: string }
interface MockMembership { userId: string; dojoId: string; role: "coach" | "lead_coach"; canCheckIn?: boolean }

// Minimal stand-in for the ElectroDB service exposing only the access patterns
// the auth helpers use. Lets us test authorization without DynamoDB.
function makeDb(users: MockUser[], memberships: MockMembership[]) {
  return {
    entities: {
      user: {
        query: {
          byEmail: ({ email }: { email: string }) => ({
            go: async () => ({ data: users.filter((u) => u.email === email) }),
          }),
        },
      },
      dojoMembership: {
        get: ({ userId, dojoId }: { userId: string; dojoId: string }) => ({
          go: async () => ({ data: memberships.find((m) => m.userId === userId && m.dojoId === dojoId) ?? null }),
        }),
        query: {
          byUser: ({ userId }: { userId: string }) => ({
            go: async () => ({ data: memberships.filter((m) => m.userId === userId) }),
          }),
        },
      },
    },
  };
}

const parentClaims = (email: string): JwtClaims => ({ sub: "cog-sub", email, "custom:role": "parent" });
const adminClaims: JwtClaims = { sub: "cog-admin", email: "admin@x.co", "custom:role": "super_admin" };

const DOJO = "dojo-1";

describe("super admin", () => {
  const db = makeDb([], []);
  it("is treated as lead_coach everywhere", async () => {
    expect(await getDojoRole(db, "", DOJO, adminClaims)).toBe("lead_coach");
    expect(await requireDojoLeadCoach(db, "", DOJO, adminClaims)).toBe(true);
    expect(await requireDojoCoach(db, "", DOJO, adminClaims)).toBe(true);
    expect(await requireCheckInCoach(db, "", DOJO, adminClaims)).toBe(true);
  });
});

describe("lead coach", () => {
  const users = [{ userId: "u1", email: "lead@x.co" }];
  const db = makeDb(users, [{ userId: "u1", dojoId: DOJO, role: "lead_coach" }]);
  const claims = parentClaims("lead@x.co");
  it("passes all dojo checks", async () => {
    expect(await getDojoRole(db, "", DOJO, claims)).toBe("lead_coach");
    expect(await requireDojoLeadCoach(db, "", DOJO, claims)).toBe(true);
    expect(await requireDojoCoach(db, "", DOJO, claims)).toBe(true);
    expect(await requireCheckInCoach(db, "", DOJO, claims)).toBe(true);
  });
});

describe("plain coach", () => {
  const users = [{ userId: "u2", email: "coach@x.co" }];
  const claims = parentClaims("coach@x.co");

  it("can check in by default (canCheckIn unset)", async () => {
    const db = makeDb(users, [{ userId: "u2", dojoId: DOJO, role: "coach" }]);
    expect(await requireDojoCoach(db, "", DOJO, claims)).toBe(true);
    expect(await requireDojoLeadCoach(db, "", DOJO, claims)).toBe(false);
    expect(await requireCheckInCoach(db, "", DOJO, claims)).toBe(true);
  });

  it("cannot check in when canCheckIn is explicitly false", async () => {
    const db = makeDb(users, [{ userId: "u2", dojoId: DOJO, role: "coach", canCheckIn: false }]);
    expect(await requireDojoCoach(db, "", DOJO, claims)).toBe(true);
    expect(await requireCheckInCoach(db, "", DOJO, claims)).toBe(false);
  });
});

describe("non-member", () => {
  const db = makeDb([{ userId: "u3", email: "nobody@x.co" }], []);
  const claims = parentClaims("nobody@x.co");
  it("fails every dojo check", async () => {
    expect(await getDojoRole(db, "", DOJO, claims)).toBeNull();
    expect(await requireDojoCoach(db, "", DOJO, claims)).toBe(false);
    expect(await requireDojoLeadCoach(db, "", DOJO, claims)).toBe(false);
    expect(await requireCheckInCoach(db, "", DOJO, claims)).toBe(false);
  });

  it("fails when the user record does not exist at all", async () => {
    const empty = makeDb([], []);
    expect(await requireCheckInCoach(empty, "", DOJO, parentClaims("ghost@x.co"))).toBe(false);
  });
});
