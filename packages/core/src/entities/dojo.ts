import { Entity } from "electrodb";
import { DocumentClient, table } from "./table.js";

export const DojoEntity = new Entity(
  {
    model: { entity: "dojo", version: "1", service: "coderdojo" },
    attributes: {
      dojoId: { type: "string", required: true },
      name: { type: "string", required: true },
      city: { type: "string", required: true },
      address: { type: "string", required: true },
      waitlistMode: { type: ["auto", "manual"] as const, required: true, default: "auto" },
      active: { type: "boolean", required: true, default: true },
      latitude: { type: "number" },
      longitude: { type: "number" },
    },
    indexes: {
      byId: {
        pk: { field: "pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "sk", composite: [], template: "#META" },
      },
      allDojos: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: [], template: "DOJOS" },
        sk: { field: "gsi1sk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
