import { Entity } from "electrodb";
import { DocumentClient, table } from "./table.js";

export const WaitlistEntryEntity = new Entity(
  {
    model: { entity: "waitlistEntry", version: "1", service: "coderdojo" },
    attributes: {
      waitlistId: { type: "string", required: true },
      eventId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      userId: { type: "string", required: true },
      position: { type: "number", required: true },
      positionPadded: { type: "string", required: true },
      ninjaName: { type: "string", required: true },
      ninjaBirthdate: { type: "string", required: true },
      parentName: { type: "string", required: true },
      parentEmail: { type: "string", required: true },
      parentPhone: { type: "string" },
      atelierId: { type: "string", required: true },
      needsComputer: { type: "boolean", required: true, default: false },
      previousVisits: { type: "number", required: true, default: 0 },
      heardAbout: { type: "string" },
      consentPhotos: { type: "boolean", required: true, default: false },
      consentContact: { type: "boolean", required: true, default: false },
      isCoachChild: { type: "boolean", required: true, default: false },
      status: {
        type: ["waiting", "promoted", "expired", "cancelled"] as const,
        required: true,
        default: "waiting",
      },
    },
    indexes: {
      byEvent: {
        pk: { field: "pk", composite: ["eventId"], template: "EVENT#${eventId}" },
        sk: { field: "sk", composite: ["positionPadded", "waitlistId"] },
      },
      byUser: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "gsi1sk", composite: ["waitlistId"], template: "WAIT#${waitlistId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
