export type GlobalRole = "parent" | "super_admin";
export type DojoRole   = "coach" | "lead_coach";
export type Role       = GlobalRole | DojoRole;   // kept for convenience / JWT compat
export type Lang       = "en" | "fr" | "nl";
export type WaitlistMode = "auto" | "manual";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";
export type WaitlistStatus = "waiting" | "promoted" | "expired" | "cancelled";
export type VolunteerStatus = "active" | "withdrawn";

export interface DojoMembership {
  dojoId: string;
  role: DojoRole;
}

export interface JwtClaims {
  sub: string;
  email: string;
  /** Global role only: "parent" | "super_admin" */
  "custom:role": GlobalRole;
}

export interface ApiEvent {
  pathParameters: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  body?: string;
  requestContext: {
    authorizer?: {
      jwt?: {
        claims: JwtClaims;
      };
    };
  };
  headers?: Record<string, string>;
  cookies?: string[];
}

export function ok(body: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function err(message: string, statusCode = 400) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: message }),
  };
}

export function getClaims(event: ApiEvent): JwtClaims {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  if (!claims) throw new Error("Unauthorized");
  return claims;
}

export function isSuperAdmin(claims: JwtClaims): boolean {
  return claims["custom:role"] === "super_admin";
}

/**
 * Resolve the DynamoDB ULID userId from the JWT claims.
 * DojoMembership (and User queries by byId) use the ULID, not the Cognito sub.
 * claims.sub is the Cognito sub — always look up via email instead.
 */
async function resolveDbUserId(db: any, claims: JwtClaims): Promise<string | null> {
  const result = await db.entities.user.query.byEmail({ email: claims.email }).go();
  return result.data[0]?.userId ?? null;
}

/**
 * Look up the caller's membership in a specific dojo.
 * Super-admins bypass the check and are treated as lead_coach everywhere.
 */
export async function getDojoRole(
  db: any,
  _cognitoSub: string,   // kept for signature compat; use claims.email internally
  dojoId: string,
  claims: JwtClaims
): Promise<DojoRole | null> {
  if (isSuperAdmin(claims)) return "lead_coach";
  const dbUserId = await resolveDbUserId(db, claims);
  if (!dbUserId) return null;
  const result = await db.entities.dojoMembership.get({ userId: dbUserId, dojoId }).go();
  return (result.data?.role as DojoRole) ?? null;
}

/**
 * Returns true if the caller is a coach or lead_coach of the given dojo
 * (or is a super_admin).
 */
export async function requireDojoCoach(
  db: any,
  userId: string,
  dojoId: string,
  claims: JwtClaims
): Promise<boolean> {
  const role = await getDojoRole(db, userId, dojoId, claims);
  return role === "coach" || role === "lead_coach";
}

/**
 * Returns true if the caller is a lead_coach of the given dojo
 * (or is a super_admin).
 */
export async function requireDojoLeadCoach(
  db: any,
  userId: string,
  dojoId: string,
  claims: JwtClaims
): Promise<boolean> {
  const role = await getDojoRole(db, userId, dojoId, claims);
  return role === "lead_coach";
}

/** Returns the user's preferredLang from DynamoDB by their DynamoDB ULID userId. */
export async function getUserLang(db: any, userId: string): Promise<Lang> {
  const result = await db.entities.user.query.byId({ userId }).go();
  return (result.data[0]?.preferredLang ?? "en") as Lang;
}

/** Returns the caller's DynamoDB ULID userId from JWT claims (via email lookup). */
export async function getDbUserId(db: any, claims: JwtClaims): Promise<string | null> {
  return resolveDbUserId(db, claims);
}
