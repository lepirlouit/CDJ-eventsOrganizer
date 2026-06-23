// Pure capacity decision logic, extracted from capacity.ts so the branching can
// be unit-tested without a DynamoDB connection.

export interface CapacityEvent {
  maxCapacity: number;
  coachReservedSeats: number;
  registrationCount: number;
  coachRegistrationCount: number;
  releaseAt?: string;
  registrationCloseAt: string;
}

export interface Atelier {
  atelierId: string;
  maxSeats?: number | null;
}

export type Outcome = "coach" | "general" | "waitlist";

/** Reserved coach seats open to everyone once releaseAt (default close time) passes. */
export function isReservedReleased(
  event: { releaseAt?: string; registrationCloseAt: string },
  now: Date
): boolean {
  const releaseAt = event.releaseAt ?? event.registrationCloseAt;
  return now > new Date(releaseAt);
}

/** True when a track has a seat limit and it is already met. */
export function atelierIsFull(atelier: Atelier | undefined, confirmedCount: number): boolean {
  if (!atelier || atelier.maxSeats === undefined || atelier.maxSeats === null) return false;
  return confirmedCount >= atelier.maxSeats;
}

/**
 * Decides where a registration lands: the coach-reserved pool, the general pool,
 * or the waitlist. A full track forces the waitlist regardless of event capacity.
 */
export function decideOutcome(params: {
  event: CapacityEvent;
  isCoachParent: boolean;
  released: boolean;
  atelierFull: boolean;
}): Outcome {
  const { event, isCoachParent, released, atelierFull } = params;

  if (!atelierFull && isCoachParent && !released && event.coachReservedSeats > 0) {
    if (event.coachRegistrationCount < event.coachReservedSeats) return "coach";
  }

  const effectiveCapacity = released
    ? event.maxCapacity
    : event.maxCapacity - event.coachReservedSeats;

  if (!atelierFull && event.registrationCount < effectiveCapacity) return "general";

  return "waitlist";
}
