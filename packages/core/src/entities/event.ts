import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const EventEntity = new Entity(
  {
    model: { entity: "event", version: "1", service: "coderdojo" },
    attributes: {
      eventId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      title: { type: "string", required: true },
      description: { type: "string" },
      date: { type: "string", required: true },
      location: {
        type: "map",
        properties: {
          address: { type: "string", required: true },
          city: { type: "string", required: true },
          mapsUrl: { type: "string" },
        },
      },
      maxCapacity: { type: "number", required: true },
      coachReservedSeats: { type: "number", required: true, default: 0 },
      registrationCount: { type: "number", required: true, default: 0 },
      coachRegistrationCount: { type: "number", required: true, default: 0 },
      waitlistCount: { type: "number", required: true, default: 0 },
      registrationOpenAt: { type: "string", required: true },
      registrationCloseAt: { type: "string", required: true },
      releaseAt: { type: "string" },
      ateliers: {
        type: "list",
        items: {
          type: "map",
          properties: {
            atelierId: { type: "string", required: true },
            name: { type: "string", required: true },
            isCustom: { type: "boolean", required: true },
            maxSeats: { type: "number" },
          },
        },
      },
      status: {
        type: ["draft", "published", "cancelled", "completed"] as const,
        required: true,
        default: "draft",
      },
    },
    indexes: {
      byDojo: {
        pk: { field: "pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "sk", composite: ["eventId"], template: "EVENT#${eventId}" },
      },
      allEvents: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: [], template: "EVENTS" },
        sk: { field: "gsi1sk", composite: ["date", "eventId"] },
      },
      byId: {
        index: "gsi2",
        pk: { field: "gsi2pk", composite: ["eventId"], template: "EVENT#${eventId}" },
        sk: { field: "gsi2sk", composite: [], template: "#META" },
      },
    },
  },
  { client: DocumentClient, table }
);
