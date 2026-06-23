import { describe, it, expect } from "vitest";
import { isReservedReleased, atelierIsFull, decideOutcome, type CapacityEvent } from "./capacity-logic.js";

const baseEvent: CapacityEvent = {
  maxCapacity: 10,
  coachReservedSeats: 2,
  registrationCount: 0,
  coachRegistrationCount: 0,
  registrationCloseAt: "2026-07-01T00:00:00.000Z",
};

describe("isReservedReleased", () => {
  it("is false before the release/close time", () => {
    expect(isReservedReleased(baseEvent, new Date("2026-06-01T00:00:00Z"))).toBe(false);
  });
  it("is true after the release/close time", () => {
    expect(isReservedReleased(baseEvent, new Date("2026-07-02T00:00:00Z"))).toBe(true);
  });
  it("prefers an explicit releaseAt over registrationCloseAt", () => {
    const ev = { ...baseEvent, releaseAt: "2026-06-15T00:00:00.000Z" };
    expect(isReservedReleased(ev, new Date("2026-06-20T00:00:00Z"))).toBe(true);
    expect(isReservedReleased(ev, new Date("2026-06-10T00:00:00Z"))).toBe(false);
  });
});

describe("atelierIsFull", () => {
  it("is never full when there is no seat limit", () => {
    expect(atelierIsFull({ atelierId: "a" }, 999)).toBe(false);
    expect(atelierIsFull({ atelierId: "a", maxSeats: null }, 999)).toBe(false);
    expect(atelierIsFull(undefined, 999)).toBe(false);
  });
  it("is full when confirmed count meets or exceeds the limit", () => {
    expect(atelierIsFull({ atelierId: "a", maxSeats: 3 }, 2)).toBe(false);
    expect(atelierIsFull({ atelierId: "a", maxSeats: 3 }, 3)).toBe(true);
    expect(atelierIsFull({ atelierId: "a", maxSeats: 3 }, 4)).toBe(true);
  });
});

describe("decideOutcome", () => {
  it("puts a coach parent in the reserved pool when seats remain", () => {
    const outcome = decideOutcome({ event: baseEvent, isCoachParent: true, released: false, atelierFull: false });
    expect(outcome).toBe("coach");
  });

  it("puts a regular parent in the general pool", () => {
    const outcome = decideOutcome({ event: baseEvent, isCoachParent: false, released: false, atelierFull: false });
    expect(outcome).toBe("general");
  });

  it("reserves seats away from the general pool before release", () => {
    // 10 capacity − 2 reserved = 8 general seats; 8 already taken → waitlist.
    const event = { ...baseEvent, registrationCount: 8 };
    expect(decideOutcome({ event, isCoachParent: false, released: false, atelierFull: false })).toBe("waitlist");
  });

  it("opens reserved seats to everyone after release", () => {
    const event = { ...baseEvent, registrationCount: 8 };
    expect(decideOutcome({ event, isCoachParent: false, released: true, atelierFull: false })).toBe("general");
  });

  it("waitlists a coach parent when reserved seats are exhausted and general is full", () => {
    const event = { ...baseEvent, coachRegistrationCount: 2, registrationCount: 8 };
    expect(decideOutcome({ event, isCoachParent: true, released: false, atelierFull: false })).toBe("waitlist");
  });

  it("forces the waitlist when the chosen track is full, even with event capacity", () => {
    expect(decideOutcome({ event: baseEvent, isCoachParent: true, released: false, atelierFull: true })).toBe("waitlist");
    expect(decideOutcome({ event: baseEvent, isCoachParent: false, released: false, atelierFull: true })).toBe("waitlist");
  });
});
