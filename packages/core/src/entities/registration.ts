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
      // Stable participant id (optional for legacy rows; always set on new writes).
      childId: { type: "string" },
      // Cognito sub of the guardian who performed this signup (mum vs dad).
      registeredByUserId: { type: "string" },
      ninjaName: { type: "string", required: true },
      ninjaBirthdate: { type: "string", required: true },
      // Optional, stamped from the child's profile at registration time.
      ninjaGender: { type: ["boy", "girl", "other", "prefer_not_to_say"] as const },
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
      // Answers to the dojo's custom questions, keyed by questionId.
      customAnswers: { type: "any" },
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
      // Sparse: only registrations created with a childId participate.
      byChild: {
        index: "gsi3",
        pk: { field: "gsi3pk", composite: ["childId"], template: "CHILD#${childId}" },
        sk: { field: "gsi3sk", composite: ["registrationId"], template: "REG#${registrationId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
