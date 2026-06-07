import React from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    logout();
    navigate("/");
  }

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, textDecoration: "none", color: "inherit", fontWeight: 700 }}
          >
            CoderDojo Events
          </Typography>
          {user ? (
            <>
              {(user.role === "coach" || user.role === "lead_coach") && (
                <Button color="inherit" component={Link} to="/dashboard/admin">
                  {t("nav.dashboard")}
                </Button>
              )}
              {user.role === "parent" && (
                <Button color="inherit" component={Link} to="/dashboard/registrations">
                  {t("nav.dashboard")}
                </Button>
              )}
              {user.role === "super_admin" && (
                <Button color="inherit" component={Link} to="/dashboard/superadmin">
                  {t("nav.dashboard")}
                </Button>
              )}
              <Button color="inherit" onClick={handleLogout}>
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <Button color="inherit" component={Link} to="/login">
              {t("nav.login")}
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  );
}
