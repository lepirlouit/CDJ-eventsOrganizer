import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const UserEntity = new Entity(
  {
    model: { entity: "user", version: "1", service: "coderdojo" },
    attributes: {
      userId: { type: "string", required: true },
      email: { type: "string", required: true },
      name: { type: "string", required: true },
      phone: { type: "string" },
      // Global role: only "parent" or "super_admin".
      // Dojo-specific roles (coach / lead_coach) live in DojoMembership.
      role: {
        type: ["parent", "super_admin"] as const,
        required: true,
        default: "parent",
      },
      cognitoSub: { type: "string" },
      preferredLang: {
        type: ["en", "fr", "nl"] as const,
        required: true,
        default: "en",
      },
      // Parent profile — prefilled on the registration form
      parentName:    { type: "string" },
      parentPhone:   { type: "string" },
      heardAbout:    { type: "string" },
      consentPhotos: { type: "boolean" },
      consentContact: { type: "boolean" },
      // Saved children list — name + birthdate per child
      savedChildren: {
        type: "list",
        items: {
          type: "map",
          properties: {
            name:           { type: "string", required: true },
            birthdate:      { type: "string", required: true },
            previousVisits: { type: "number" },
          },
        },
      },
    },
    indexes: {
      byId: {
        pk: { field: "pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "sk", composite: [], template: "#META" },
      },
      byEmail: {
        index: "gsi2",
        pk: { field: "gsi2pk", composite: ["email"] },
        sk: { field: "gsi2sk", composite: [], template: "#USER" },
      },
    },
  },
  { client: DocumentClient, table }
);
