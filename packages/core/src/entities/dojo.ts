import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

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
      // Multiple venues where this dojo can host events
      locations: {
        type: "list",
        items: {
          type: "map",
          properties: {
            locationId: { type: "string", required: true },
            name:       { type: "string", required: true },
            address:    { type: "string", required: true },
            city:       { type: "string", required: true },
            latitude:   { type: "number" },
            longitude:  { type: "number" },
            mapsUrl:    { type: "string" },
          },
        },
      },
      // Reusable per-dojo activity tracks, editable by lead coaches and
      // selectable per event. When empty, events fall back to GLOBAL_ATELIERS.
      tracks: {
        type: "list",
        items: {
          type: "map",
          properties: {
            trackId: { type: "string", required: true },
            name:    { type: "string", required: true },
            active:  { type: "boolean", required: true },
          },
        },
      },
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
