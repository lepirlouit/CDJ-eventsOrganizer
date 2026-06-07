import { Service } from "electrodb";
import { DocumentClient, table } from "./client.js";
import { DojoEntity } from "./dojo.js";
import { UserEntity } from "./user.js";
import { EventEntity } from "./event.js";
import { RegistrationEntity } from "./registration.js";
import { WaitlistEntryEntity } from "./waitlist-entry.js";
import { EventVolunteerEntity } from "./event-volunteer.js";
import { DojoMembershipEntity } from "./dojo-membership.js";

export { DocumentClient, table } from "./client.js";

export const db = new Service(
  {
    dojo: DojoEntity,
    user: UserEntity,
    event: EventEntity,
    registration: RegistrationEntity,
    waitlistEntry: WaitlistEntryEntity,
    eventVolunteer: EventVolunteerEntity,
    dojoMembership: DojoMembershipEntity,
  },
  { client: DocumentClient, table }
);
