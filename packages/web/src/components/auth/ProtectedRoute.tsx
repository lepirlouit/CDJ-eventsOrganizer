import React from "react";
import { Navigate } from "react-router-dom";
import type { GlobalRole } from "@coderdojo/core";
import { useAuth, isAnyCoach } from "../../hooks/useAuth";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface Props {
  /** Restrict to specific global roles (parent / super_admin). */
  roles?: GlobalRole[];
  /** Allow any user that has at least one coach/lead_coach membership. */
  requireAnyCoach?: boolean;
  children: React.ReactNode;
}

export function ProtectedRoute({ roles, requireAnyCoach, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireAnyCoach && !isAnyCoach(user)) return <Navigate to="/" replace />;

  if (roles && !roles.includes(user.globalRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
