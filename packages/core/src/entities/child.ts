import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

export const ChildEntity = new Entity(
  {
    model: { entity: "child", version: "1", service: "coderdojo" },
    attributes: {
      childId: { type: "string", required: true },
      // Owner = the parent's Cognito sub (claims.sub), matching how
      // Registration keys userId. NOT the DynamoDB ULID.
      userId: { type: "string", required: true },
      name: { type: "string", required: true },
      birthdate: { type: "string", required: true },
      // Optional, self-declared. Drives super-admin boy/girl statistics.
      gender: { type: ["boy", "girl", "other", "prefer_not_to_say"] as const },
      previousVisits: { type: "number" },
      notes: { type: "string" },
      // Canonical unique-participant id. Unset means the child is its own
      // participant (effective participantId = participantId ?? childId).
      // Set by a coach-side merge to unify duplicate profiles (e.g. the same
      // child added by both mum and dad on separate accounts).
      participantId: { type: "string" },
      createdAt: { type: "string", required: true, default: () => new Date().toISOString() },
    },
    indexes: {
      byId: {
        pk: { field: "pk", composite: ["childId"], template: "CHILD#${childId}" },
        sk: { field: "sk", composite: [], template: "#META" },
      },
      byUser: {
        index: "gsi1",
        pk: { field: "gsi1pk", composite: ["userId"], template: "USER#${userId}" },
        sk: { field: "gsi1sk", composite: ["childId"], template: "CHILD#${childId}" },
      },
      // Sparse: only set once a merge assigns a participantId.
      byParticipant: {
        index: "gsi2",
        pk: { field: "gsi2pk", composite: ["participantId"], template: "PARTICIPANT#${participantId}" },
        sk: { field: "gsi2sk", composite: ["childId"], template: "CHILD#${childId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
