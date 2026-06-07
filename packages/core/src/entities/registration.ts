import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const RegistrationEntity = new Entity(
  {
    model: { entity: "registration", version: "1", service: "coderdojo" },
    attributes: {
      registrationId: { type: "string", required: true },
      eventId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      userId: { type: "string", required: true },
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
      status: {
        type: ["confirmed", "waitlisted", "cancelled"] as const,
        required: true,
        default: "confirmed",
      },
      isCoachChild: { type: "boolean", required: true, default: false },
      checkedIn: { type: "boolean", required: true, default: false },
      checkedInAt: { type: "string" },
      checkedInBy: { type: "string" },
    },
    indexes: {
      byEvent: {
        pk: { field: "pk", composite: ["eventId"], template: "EVENT#${eventId}" },
        sk: { field: "sk", composite: ["registrationId"], template: "REG#${registrationId}" },
      },
      byDojo: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "gsi1sk", composite: ["registrationId"], template: "REG#${registrationId}" },
      },
      byUser: {
        index: "gsi2",
        pk: { field: "gsi2pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "gsi2sk", composite: ["registrationId"], template: "REG#${registrationId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
