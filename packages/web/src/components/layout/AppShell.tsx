import { Outlet, Link, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import { useTranslation } from "react-i18next";
import { useAuth, isAnyCoach } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { LanguageSwitcher } from "./LanguageSwitcher";

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
          <LanguageSwitcher />
          {user ? (
            <>
              {isAnyCoach(user) && (
                <Button color="inherit" component={Link} to="/dashboard/admin">
                  {t("nav.dashboard")}
                </Button>
              )}
              {user.globalRole === "super_admin" && (
                <Button color="inherit" component={Link} to="/dashboard/superadmin">
                  Super Admin
                </Button>
              )}
              {(isAnyCoach(user) || user.globalRole === "parent") && (
                <>
                  <Button color="inherit" component={Link} to="/dashboard/children">
                    {t("nav.my_children")}
                  </Button>
                  <Button color="inherit" component={Link} to="/dashboard/registrations">
                    {t("nav.my_registrations")}
                  </Button>
                </>
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
