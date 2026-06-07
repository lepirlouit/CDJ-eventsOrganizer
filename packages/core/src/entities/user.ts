import { Entity } from "electrodb";
import { DocumentClient, table } from "./table.js";

export const UserEntity = new Entity(
  {
    model: { entity: "user", version: "1", service: "coderdojo" },
    attributes: {
      userId: { type: "string", required: true },
      email: { type: "string", required: true },
      name: { type: "string", required: true },
      phone: { type: "string" },
      role: {
        type: ["parent", "coach", "lead_coach", "super_admin"] as const,
        required: true,
        default: "parent",
      },
      dojoId: { type: "string" },
      cognitoSub: { type: "string" },
      preferredLang: {
        type: ["en", "fr", "nl"] as const,
        required: true,
        default: "en",
      },
    },
    indexes: {
      byId: {
        pk: { field: "pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "sk", composite: [], template: "#META" },
      },
      byDojo: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "gsi1sk", composite: ["userId"], template: "USER#${userId}" },
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
