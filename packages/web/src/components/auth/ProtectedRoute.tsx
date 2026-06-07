import React from "react";
import { Navigate } from "react-router-dom";
import type { Role } from "@coderdojo/core";
import { useAuth } from "../../hooks/useAuth";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

interface Props {
  roles?: Role[];
  children: React.ReactNode;
}

export function ProtectedRoute({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
