/**
 * Seed script — run with:
 *   npx sst shell --stage dev npx tsx scripts/seed.ts
 *
 * Inserts real Belgian CoderDojo locations + sample upcoming events.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Service } from "electrodb";
import { Resource } from "sst";
import { ulid } from "ulid";

// ── Entities (inline to avoid depending on built package) ───────────────────
import { DojoEntity }            from "../packages/core/src/entities/dojo.js";
import { EventEntity }           from "../packages/core/src/entities/event.js";
import { RegistrationEntity }    from "../packages/core/src/entities/registration.js";
import { UserEntity }            from "../packages/core/src/entities/user.js";
import { WaitlistEntryEntity }   from "../packages/core/src/entities/waitlist-entry.js";
import { EventVolunteerEntity }  from "../packages/core/src/entities/event-volunteer.js";
import { DojoMembershipEntity }  from "../packages/core/src/entities/dojo-membership.js";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const tableName = Resource.MainTable.name;

const db = new Service(
  {
    dojo: DojoEntity,
    user: UserEntity,
    event: EventEntity,
    registration: RegistrationEntity,
    waitlistEntry: WaitlistEntryEntity,
    eventVolunteer: EventVolunteerEntity,
    dojoMembership: DojoMembershipEntity,
  },
  { client, table: tableName }
);

// ── Real Belgian CoderDojo data ─────────────────────────────────────────────
const DOJOS = [
  {
    name: "CoderDojo Brussel",
    city: "Brussel",
    address: "Cantersteen 10, 1000 Brussel",
    latitude: 50.8453,
    longitude: 4.3571,
  },
  {
    name: "CoderDojo Gent",
    city: "Gent",
    address: "Vrijdagmarkt 10, 9000 Gent",
    latitude: 51.0543,
    longitude: 3.7174,
  },
  {
    name: "CoderDojo Antwerpen",
    city: "Antwerpen",
    address: "Koningin Astridplein 20, 2018 Antwerpen",
    latitude: 51.2194,
    longitude: 4.4025,
  },
  {
    name: "CoderDojo Leuven",
    city: "Leuven",
    address: "Naamsestraat 22, 3000 Leuven",
    latitude: 50.8798,
    longitude: 4.7005,
  },
  {
    name: "CoderDojo Brugge",
    city: "Brugge",
    address: "Markt 7, 8000 Brugge",
    latitude: 51.2093,
    longitude: 3.2247,
  },
  {
    name: "CoderDojo Liège",
    city: "Liège",
    address: "Place Saint-Lambert 2, 4000 Liège",
    latitude: 50.6452,
    longitude: 5.5731,
  },
  {
    name: "CoderDojo Namur",
    city: "Namur",
    address: "Place d'Armes 1, 5000 Namur",
    latitude: 50.4669,
    longitude: 4.8676,
  },
  {
    name: "Coder Dojo Ath",
    city: "Ath",
    address: "16 Boulevard du Château, 7800 Ath",
    latitude: 50.6328,
    longitude: 3.7772,
  },
  {
    name: "CoderDojo Asse",
    city: "Asse",
    address: "26 Gemeenteplein, 1730 Asse",
    latitude: 50.9072,
    longitude: 4.1988,
  },
  {
    name: "CoderDojo Ieper",
    city: "Ieper",
    address: "Weverijstraat 9, 8900 Ieper",
    latitude: 50.8503,
    longitude: 2.8818,
  },
  {
    name: "CoderDojo Kortenberg",
    city: "Kortenberg",
    address: "Dr. V. De Walsplein 30, 3070 Kortenberg",
    latitude: 50.8803,
    longitude: 4.5386,
  },
  {
    name: "CoderDojo Westerlo",
    city: "Westerlo",
    address: "5 Kasteelpark, 2260 Westerlo",
    latitude: 51.0906,
    longitude: 4.9183,
  },
  {
    name: "CoderDojo Deinze",
    city: "Deinze",
    address: "25 Brielstraat, 9800 Deinze",
    latitude: 50.9823,
    longitude: 3.5301,
  },
  {
    name: "CoderDojo Tielt",
    city: "Tielt",
    address: "Lakenmarkt 9, 8700 Tielt",
    latitude: 50.9976,
    longitude: 3.3253,
  },
  {
    name: "CoderDojo Forest",
    city: "Forest",
    address: "Place Saint-Denis 16, 1190 Forest",
    latitude: 50.8165,
    longitude: 4.3418,
    coachEmail: "1190@coderdojobelgium.be",
  },
];

const ATELIERS = [
  { atelierId: "scratch",   name: "Scratch",    isCustom: false },
  { atelierId: "python",    name: "Python",      isCustom: false },
  { atelierId: "microbit",  name: "Micro:bit",   isCustom: false },
  { atelierId: "html",      name: "HTML/CSS",    isCustom: false },
  { atelierId: "minecraft", name: "Minecraft",   isCustom: false },
  { atelierId: "arduino",   name: "Arduino",     isCustom: false },
];

// Sample ninja / parent names for realistic registrations
const NINJAS   = ["Axel", "Lena", "Mathis", "Emma", "Noah", "Olivia", "Lucas", "Mia", "Hugo", "Sara"];
const PARENTS  = ["Dupont", "Janssen", "Maes", "Peeters", "Claes", "Lambert", "Nijs", "Willems"];
const ATELIERS_IDS = ATELIERS.map((a) => a.atelierId);

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysFromNow: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function seed() {
  console.log(`\n🌱  Seeding table: ${tableName}\n`);

  for (const dojoData of DOJOS) {
    const dojoId = ulid();
    console.log(`  📍  Creating dojo: ${dojoData.name}`);

    await db.entities.dojo.put({
      dojoId,
      name: dojoData.name,
      city: dojoData.city,
      address: dojoData.address,
      waitlistMode: "auto",
      active: true,
      latitude: dojoData.latitude,
      longitude: dojoData.longitude,
    }).go();

    // Create a lead-coach user for this dojo
    const coachId = ulid();
    const coachEmail = (dojoData as any).coachEmail
      ?? `coach.${dojoData.city.toLowerCase().replace(/[^a-z]/g, "")}@coderdojo.be`;
    const isFrench = ["Liège", "Namur", "Ath"].includes(dojoData.city);
    await db.entities.user.put({
      userId: coachId,
      email: coachEmail,
      name: `Lead Coach ${dojoData.city}`,
      role: "parent",   // global role; dojo role lives in DojoMembership
      preferredLang: isFrench ? "fr" : "nl",
    }).go();

    // Grant lead_coach role in this dojo via DojoMembership
    await db.entities.dojoMembership.put({
      userId: coachId,
      dojoId,
      role: "lead_coach",
    }).go();

    // Create 2 upcoming events per dojo
    for (let e = 0; e < 2; e++) {
      const eventId = ulid();
      const daysAhead = 7 + e * 21; // next Saturday, then 3 weeks later
      const capacity = 24 + Math.floor(Math.random() * 8) * 2; // 24–38
      const coachReserved = e === 0 ? 4 : 2;

      const eventDate = isoDate(daysAhead);
      const openAt    = isoDateTime(-7);       // already open
      const closeAt   = isoDateTime(daysAhead - 1, 23);

      console.log(`      📅  Event ${e + 1}: ${eventDate}`);

      await db.entities.event.put({
        eventId,
        dojoId,
        title: `CoderDojo ${dojoData.city} — ${new Date(eventDate).toLocaleDateString("fr-BE", { day: "numeric", month: "long" })}`,
        description: `Bienvenue / Welkom bij CoderDojo ${dojoData.city}! Alle niveaus welkom — van beginners tot gevorderden.`,
        date: eventDate,
        location: {
          address: dojoData.address,
          city: dojoData.city,
          mapsUrl: `https://maps.google.com/?q=${dojoData.latitude},${dojoData.longitude}`,
        },
        maxCapacity: capacity,
        coachReservedSeats: coachReserved,
        registrationCount: 0,
        coachRegistrationCount: 0,
        waitlistCount: 0,
        registrationOpenAt: openAt,
        registrationCloseAt: closeAt,
        ateliers: ATELIERS,
        status: "published",
      }).go();

      // Add 6–10 sample registrations per event
      const regCount = 6 + Math.floor(Math.random() * 5);
      for (let r = 0; r < regCount; r++) {
        const registrationId = ulid();
        const userId = ulid();
        const ninjaName = `${randomItem(NINJAS)} ${randomItem(PARENTS)}`;
        const parentName = `${randomItem(PARENTS)} Family`;
        const parentEmail = `parent${r}@example.com`;

        await db.entities.registration.put({
          registrationId,
          eventId,
          dojoId,
          userId,
          ninjaName,
          ninjaBirthdate: "2015-03-15",
          parentName,
          parentEmail,
          atelierId: randomItem(ATELIERS_IDS),
          needsComputer: Math.random() > 0.6,
          previousVisits: Math.floor(Math.random() * 5),
          consentPhotos: true,
          consentContact: true,
          status: "confirmed",
          isCoachChild: false,
          checkedIn: false,
        }).go();
      }

      // Bump registrationCount on event
      await db.entities.event.patch({ dojoId, eventId })
        .add({ registrationCount: regCount })
        .go();
    }
  }

  // Create one super-admin user
  const adminId = ulid();
  await db.entities.user.put({
    userId: adminId,
    email: "admin@coderdojo.be",
    name: "Super Admin",
    role: "super_admin",
    preferredLang: "fr",
  }).go();

  console.log("\n✅  Seed complete!\n");
  console.log("   Super-admin email : admin@coderdojo.be");
  console.log("   Lead-coach emails : coach.<city>@coderdojo.be");
  console.log(`   Dojos created     : ${DOJOS.length}`);
  console.log(`   Events created    : ${DOJOS.length * 2}`);
  console.log("   1190@coderdojobelgium.be is lead coach of CoderDojo Forest");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
