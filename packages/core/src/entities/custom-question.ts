import { Entity } from "electrodb";
import { DocumentClient, table } from "./client.js";

// Dojo-configurable registration questions. A lead coach defines these per dojo
// and they render dynamically on the registration form; answers are stored in
// the registration's `customAnswers` map keyed by questionId.
export const CustomQuestionEntity = new Entity(
  {
    model: { entity: "customQuestion", version: "1", service: "coderdojo" },
    attributes: {
      questionId: { type: "string", required: true },
      dojoId: { type: "string", required: true },
      label: { type: "string", required: true },
      type: { type: ["text", "select", "checkbox"] as const, required: true, default: "text" },
      // Choices for `select` questions.
      options: { type: "list", items: { type: "string" } },
      required: { type: "boolean", required: true, default: false },
      order: { type: "number", required: true, default: 0 },
      active: { type: "boolean", required: true, default: true },
      createdAt: { type: "string", required: true, default: () => new Date().toISOString() },
    },
    indexes: {
      byDojo: {
        pk: { field: "pk", composite: ["dojoId"], template: "DOJO#${dojoId}" },
        sk: { field: "sk", composite: ["questionId"], template: "QUESTION#${questionId}" },
      },
    },
  },
  { client: DocumentClient, table }
);
