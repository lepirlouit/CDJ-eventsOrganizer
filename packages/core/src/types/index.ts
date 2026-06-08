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
 * Look up the caller's membership in a specific dojo.
 * Super-admins bypass the check and are treated as lead_coach everywhere.
 */
export async function getDojoRole(
  db: any,
  userId: string,
  dojoId: string,
  claims: JwtClaims
): Promise<DojoRole | null> {
  if (isSuperAdmin(claims)) return "lead_coach";
  const result = await db.entities.dojoMembership.get({ userId, dojoId }).go();
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

/** Returns the user's preferredLang from DynamoDB, falling back to "en". */
export async function getUserLang(db: any, userId: string): Promise<Lang> {
  const result = await db.entities.user.query.byId({ userId }).go();
  return (result.data[0]?.preferredLang ?? "en") as Lang;
}
