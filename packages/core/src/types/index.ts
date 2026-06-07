export type Role = "parent" | "coach" | "lead_coach" | "super_admin";
export type Lang = "en" | "fr" | "nl";
export type WaitlistMode = "auto" | "manual";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type RegistrationStatus = "confirmed" | "waitlisted" | "cancelled";
export type WaitlistStatus = "waiting" | "promoted" | "expired" | "cancelled";
export type VolunteerStatus = "active" | "withdrawn";

export interface JwtClaims {
  sub: string;
  email: string;
  "custom:role": Role;
  "custom:dojoId": string;
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

export function isCoachOrAbove(role: Role): boolean {
  return role === "coach" || role === "lead_coach" || role === "super_admin";
}

export function isLeadCoachOrAbove(role: Role): boolean {
  return role === "lead_coach" || role === "super_admin";
}
