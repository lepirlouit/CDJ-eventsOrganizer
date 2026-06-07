import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Service } from "electrodb";
import { Resource } from "sst";
import { DojoEntity } from "./dojo.js";
import { UserEntity } from "./user.js";
import { EventEntity } from "./event.js";
import { RegistrationEntity } from "./registration.js";
import { WaitlistEntryEntity } from "./waitlist-entry.js";
import { EventVolunteerEntity } from "./event-volunteer.js";

export const DocumentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({}),
  { marshallOptions: { removeUndefinedValues: true } }
);

export const table = Resource.MainTable.name;

export const db = new Service(
  {
    dojo: DojoEntity,
    user: UserEntity,
    event: EventEntity,
    registration: RegistrationEntity,
    waitlistEntry: WaitlistEntryEntity,
    eventVolunteer: EventVolunteerEntity,
  },
  { client: DocumentClient, table }
);
