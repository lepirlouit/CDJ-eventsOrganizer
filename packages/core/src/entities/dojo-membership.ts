import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const DojoMembershipEntity = new Entity(
  {
    model: { entity: "dojoMembership", version: "1", service: "coderdojo" },
    attributes: {
      userId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      role: { type: ["coach", "lead_coach"] as const, required: true },
      // Whether a plain coach may perform door check-ins. Lead coaches set this.
      // Optional + absence means allowed (default true), so existing rows keep access.
      canCheckIn: { type: "boolean" },
      createdAt: { type: "string", required: true, default: () => new Date().toISOString() },
    },
    indexes: {
      byUser: {
        pk: { field: "pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "sk", composite: ["dojoId"], template: "MEMBERSHIP#${dojoId}" },
      },
      byDojo: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "gsi1sk", composite: ["userId"], template: "MEMBER#${userId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
