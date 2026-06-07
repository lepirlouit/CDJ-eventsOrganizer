import { createContext, useContext } from "react";
import type { Role } from "@coderdojo/core";

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  dojoId?: string;
  name?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (token: string, idToken: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function parseIdToken(idToken: string): AuthUser {
  const payload = JSON.parse(atob(idToken.split(".")[1]));
  return {
    sub: payload.sub,
    email: payload.email,
    role: (payload["custom:role"] ?? "parent") as Role,
    dojoId: payload["custom:dojoId"],
    name: payload.name,
  };
}
