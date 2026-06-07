import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const EventVolunteerEntity = new Entity(
  {
    model: { entity: "eventVolunteer", version: "1", service: "coderdojo" },
    attributes: {
      eventId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      userId: { type: "string", required: true },
      coachName: { type: "string", required: true },
      coachEmail: { type: "string", required: true },
      skills: { type: "string" },
      notes: { type: "string" },
      signedUpAt: { type: "string", required: true },
      status: {
        type: ["active", "withdrawn"] as const,
        required: true,
        default: "active",
      },
    },
    indexes: {
      byEvent: {
        pk: { field: "pk", composite: ["eventId"], template: "EVENT#${eventId}" },
        sk: { field: "sk", composite: ["userId"], template: "VOL#${userId}" },
      },
      byUser: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "gsi1sk", composite: ["eventId"], template: "VOL#${eventId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
