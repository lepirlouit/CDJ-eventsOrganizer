import { ulid } from "ulid";
import { db } from "../entities/index.js";
import type { Role } from "../types/index.js";

// Explicit type for the registration base to avoid ElectroDB's overloaded
// put() signature causing TypeScript to infer the array-batch overload.
type RegistrationBase = {
  registrationId: string;
  eventId: string;
  dojoId: string;
  userId: string;
  ninjaName: string;
  ninjaBirthdate: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  atelierId: string;
  needsComputer: boolean;
  previousVisits: number;
  heardAbout?: string;
  consentPhotos: boolean;
  consentContact: boolean;
  isCoachChild: boolean;
  checkedIn: false;
};

function zeroPad(n: number, width = 8): string {
  return String(n).padStart(width, "0");
}

function isReservedReleased(event: {
  releaseAt?: string;
  registrationCloseAt: string;
}): boolean {
  const releaseAt = event.releaseAt ?? event.registrationCloseAt;
  return new Date() > new Date(releaseAt);
}

export async function registerParticipant(params: {
  eventId: string;
  dojoId: string;
  userId: string;
  callerRole: Role;
  ninjaName: string;
  ninjaBirthdate: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  atelierId: string;
  needsComputer: boolean;
  previousVisits: number;
  heardAbout?: string;
  consentPhotos: boolean;
  consentContact: boolean;
}) {
  const eventResult = await db.entities.event.query.byId({ eventId: params.eventId }).go();
  const event = eventResult.data[0];
  if (!event) throw Object.assign(new Error("Event not found"), { statusCode: 404 });
  if (event.status !== "published") throw Object.assign(new Error("Event is not open for registration"), { statusCode: 409 });

  const now = new Date().toISOString();
  if (now < event.registrationOpenAt || now > event.registrationCloseAt) {
    throw Object.assign(new Error("Registration is not open"), { statusCode: 409 });
  }

  const isCoachParent = params.callerRole === "coach" || params.callerRole === "lead_coach";
  const released = isReservedReleased(event);
  const registrationId = ulid();

  const base: RegistrationBase = {
    registrationId,
    eventId: params.eventId,
    dojoId: params.dojoId,
    userId: params.userId,
    ninjaName: params.ninjaName,
    ninjaBirthdate: params.ninjaBirthdate,
    parentName: params.parentName,
    parentEmail: params.parentEmail,
    parentPhone: params.parentPhone,
    atelierId: params.atelierId,
    needsComputer: params.needsComputer,
    previousVisits: params.previousVisits,
    heardAbout: params.heardAbout,
    consentPhotos: params.consentPhotos,
    consentContact: params.consentContact,
    isCoachChild: isCoachParent,
    checkedIn: false,
  };

  // Try reserved pool first for coach parents
  if (isCoachParent && !released && event.coachReservedSeats > 0) {
    if (event.coachRegistrationCount < event.coachReservedSeats) {
      await tryConfirm(base, event, "coach");
      return { status: "confirmed", registrationId, isCoachChild: true };
    }
  }

  // General pool check
  const effectiveCapacity = released
    ? event.maxCapacity
    : event.maxCapacity - event.coachReservedSeats;

  if (event.registrationCount < effectiveCapacity) {
    await tryConfirm(base, event, "general");
    return { status: "confirmed", registrationId, isCoachChild: isCoachParent };
  }

  // Fall through to waitlist
  const position = event.waitlistCount + 1;
  await db.entities.waitlistEntry.put({
    ...base,
    waitlistId: registrationId,
    position,
    positionPadded: zeroPad(position),
    status: "waiting",
  }).go();

  await db.entities.event.patch({ dojoId: params.dojoId, eventId: params.eventId })
    .add({ waitlistCount: 1 })
    .go();

  return { status: "waitlisted", registrationId, position, isCoachChild: isCoachParent };
}

async function tryConfirm(
  base: RegistrationBase,
  event: { dojoId: string; eventId: string },
  pool: "coach" | "general"
) {
  // Cast to any: ElectroDB v3's put() has two overloads (single item and batch
  // array). TypeScript resolves Parameters<typeof put>[0] as the array overload,
  // making the single-item call appear invalid. The runtime behaviour is correct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.entities.registration.put as any)({ ...base, status: "confirmed" }).go();

  if (pool === "coach") {
    await db.entities.event.patch({ dojoId: event.dojoId, eventId: event.eventId })
      .add({ coachRegistrationCount: 1 })
      .go();
  } else {
    await db.entities.event.patch({ dojoId: event.dojoId, eventId: event.eventId })
      .add({ registrationCount: 1 })
      .go();
  }
}

export async function cancelRegistration(params: {
  registrationId: string;
  eventId: string;
  userId: string;
  waitlistMode: "auto" | "manual";
}) {
  const regResult = await db.entities.registration.query
    .byEvent({ eventId: params.eventId })
    .where(({ registrationId }, op) => op.eq(registrationId, params.registrationId))
    .go();
  const reg = regResult.data[0];
  if (!reg) throw Object.assign(new Error("Registration not found"), { statusCode: 404 });
  if (reg.userId !== params.userId) throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  if (reg.status === "cancelled") throw Object.assign(new Error("Already cancelled"), { statusCode: 409 });

  await db.entities.registration.patch({ eventId: params.eventId, registrationId: params.registrationId })
    .set({ status: "cancelled" })
    .go();

  if (reg.isCoachChild) {
    await db.entities.event.patch({ dojoId: reg.dojoId, eventId: params.eventId })
      .add({ coachRegistrationCount: -1 })
      .go();
  } else {
    await db.entities.event.patch({ dojoId: reg.dojoId, eventId: params.eventId })
      .add({ registrationCount: -1 })
      .go();
  }

  return reg;
}
