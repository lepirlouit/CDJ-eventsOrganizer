import { createContext, useContext } from "react";
import type { GlobalRole } from "@coderdojo/core";

export interface DojoMembership {
  dojoId: string;
  dojoName: string;
  dojoCity: string;
  role: "coach" | "lead_coach";
}

export interface AuthUser {
  sub: string;
  email: string;
  /** Global role only — "parent" or "super_admin" */
  globalRole: GlobalRole;
  name?: string;
  /** All dojo-specific memberships fetched from /users/me/memberships */
  memberships: DojoMembership[];
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (accessToken: string, idToken: string) => void;
  logout: () => void;
  setMemberships: (memberships: DojoMembership[]) => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  loading: true,
  login: () => {},
  logout: () => {},
  setMemberships: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function parseIdToken(idToken: string): Omit<AuthUser, "memberships"> {
  const payload = JSON.parse(atob(idToken.split(".")[1]));
  return {
    sub: payload.sub,
    email: payload.email,
    globalRole: (payload["custom:role"] ?? "parent") as GlobalRole,
    name: payload.name,
  };
}

/** True if the user is a coach or lead_coach in any dojo. */
export function isAnyCoach(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.globalRole === "super_admin") return true;
  return user.memberships.some((m) => m.role === "coach" || m.role === "lead_coach");
}

/** True if the user is a lead_coach in any dojo. */
export function isAnyLeadCoach(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.globalRole === "super_admin") return true;
  return user.memberships.some((m) => m.role === "lead_coach");
}

/** Returns the user's role in a specific dojo, or null. */
export function roleInDojo(user: AuthUser | null, dojoId: string): "coach" | "lead_coach" | null {
  if (!user) return null;
  if (user.globalRole === "super_admin") return "lead_coach";
  return user.memberships.find((m) => m.dojoId === dojoId)?.role ?? null;
}
