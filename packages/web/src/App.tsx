import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./lib/theme";
import { AuthContext, parseIdToken } from "./hooks/useAuth";
import { setAccessToken, api } from "./lib/api";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Public pages
import { HomePage } from "./pages/public/HomePage";
import { EventDetailPage } from "./pages/public/EventDetailPage";

// Auth pages
import { LoginPage } from "./pages/auth/LoginPage";
import { VerifyOtpPage } from "./pages/auth/VerifyOtpPage";

// Parent pages
import { MyRegistrationsPage } from "./pages/parent/MyRegistrationsPage";
import { RegisterPage } from "./pages/parent/RegisterPage";

// Admin pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminEventEditPage } from "./pages/admin/AdminEventEditPage";
import { AdminRegistrantsPage } from "./pages/admin/AdminRegistrantsPage";
import { AdminWaitlistPage } from "./pages/admin/AdminWaitlistPage";
import { AdminCheckinPage } from "./pages/admin/AdminCheckinPage";
import { AdminVolunteersPage } from "./pages/admin/AdminVolunteersPage";

// Super Admin pages
import { SuperAdminDojosPage } from "./pages/superadmin/SuperAdminDojosPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function App() {
  const [user, setUser] = useState<ReturnType<typeof parseIdToken> | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem("accessToken");
    const savedId = sessionStorage.getItem("idToken");
    if (saved && savedId) {
      setToken(saved);
      setAccessToken(saved);
      setUser(parseIdToken(savedId));
      setLoading(false);
    } else {
      api
        .get("/auth/session", { withCredentials: true })
        .then(({ data }) => {
          setToken(data.accessToken);
          setAccessToken(data.accessToken);
          setUser(parseIdToken(data.idToken));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback((token: string, idToken: string) => {
    sessionStorage.setItem("accessToken", token);
    sessionStorage.setItem("idToken", idToken);
    setToken(token);
    setAccessToken(token);
    setUser(parseIdToken(idToken));
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setToken(null);
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/events/:eventId" element={<EventDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/login/verify" element={<VerifyOtpPage />} />
                <Route
                  path="/register/:eventId"
                  element={
                    <ProtectedRoute>
                      <RegisterPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/registrations"
                  element={
                    <ProtectedRoute roles={["parent"]}>
                      <MyRegistrationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminEventsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events/:id/edit"
                  element={
                    <ProtectedRoute roles={["lead_coach"]}>
                      <AdminEventEditPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events/:id/registrants"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminRegistrantsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events/:id/waitlist"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminWaitlistPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events/:id/checkin"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminCheckinPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/admin/events/:id/volunteers"
                  element={
                    <ProtectedRoute roles={["coach", "lead_coach"]}>
                      <AdminVolunteersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/superadmin"
                  element={
                    <ProtectedRoute roles={["super_admin"]}>
                      <SuperAdminDojosPage />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
