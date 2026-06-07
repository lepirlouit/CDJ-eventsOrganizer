import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { theme } from "./lib/theme";
import { AuthContext, parseIdToken, type DojoMembership } from "./hooks/useAuth";
import { setAccessToken, api } from "./lib/api";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Pages
import { HomePage }              from "./pages/public/HomePage";
import { DojoEventsPage }        from "./pages/public/DojoEventsPage";
import { EventDetailPage }       from "./pages/public/EventDetailPage";
import { LoginPage }             from "./pages/auth/LoginPage";
import { VerifyOtpPage }         from "./pages/auth/VerifyOtpPage";
import { MyRegistrationsPage }   from "./pages/parent/MyRegistrationsPage";
import { RegisterPage }          from "./pages/parent/RegisterPage";
import { AdminDashboardPage }    from "./pages/admin/AdminDashboardPage";
import { AdminEventsPage }       from "./pages/admin/AdminEventsPage";
import { AdminEventEditPage }    from "./pages/admin/AdminEventEditPage";
import { AdminRegistrantsPage }  from "./pages/admin/AdminRegistrantsPage";
import { AdminWaitlistPage }     from "./pages/admin/AdminWaitlistPage";
import { AdminCheckinPage }      from "./pages/admin/AdminCheckinPage";
import { AdminVolunteersPage }   from "./pages/admin/AdminVolunteersPage";
import { SuperAdminDojosPage }   from "./pages/superadmin/SuperAdminDojosPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

type BaseUser = ReturnType<typeof parseIdToken>;

export default function App() {
  const [baseUser, setBaseUser]   = useState<BaseUser | null>(null);
  const [memberships, setMemberships] = useState<DojoMembership[]>([]);
  const [accessToken, setToken]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const user = baseUser ? { ...baseUser, memberships } : null;

  async function fetchMemberships(token: string) {
    try {
      const { data } = await api.get("/users/me/memberships");
      setMemberships(data);
    } catch {
      setMemberships([]);
    }
  }

  useEffect(() => {
    const saved   = sessionStorage.getItem("accessToken");
    const savedId = sessionStorage.getItem("idToken");
    if (saved && savedId) {
      setToken(saved);
      setAccessToken(saved);
      setBaseUser(parseIdToken(savedId));
      fetchMemberships(saved).finally(() => setLoading(false));
    } else {
      api.get("/auth/session", { withCredentials: true })
        .then(({ data }) => {
          setToken(data.accessToken);
          setAccessToken(data.accessToken);
          setBaseUser(parseIdToken(data.idToken));
          return fetchMemberships(data.accessToken);
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
    setBaseUser(parseIdToken(idToken));
    fetchMemberships(token);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.clear();
    setToken(null);
    setAccessToken(null);
    setBaseUser(null);
    setMemberships([]);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={{ user, accessToken, loading, login, logout, setMemberships }}>
          <BrowserRouter>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/"                       element={<HomePage />} />
                <Route path="/dojos/:dojoId/events"   element={<DojoEventsPage />} />
                <Route path="/events/:eventId"        element={<EventDetailPage />} />
                <Route path="/login"                  element={<LoginPage />} />
                <Route path="/login/verify"           element={<VerifyOtpPage />} />

                <Route path="/register/:eventId" element={
                  <ProtectedRoute><RegisterPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/registrations" element={
                  <ProtectedRoute roles={["parent"]}><MyRegistrationsPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin" element={
                  <ProtectedRoute requireAnyCoach><AdminDashboardPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events" element={
                  <ProtectedRoute requireAnyCoach><AdminEventsPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events/:id/edit" element={
                  <ProtectedRoute requireAnyCoach><AdminEventEditPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events/:id/registrants" element={
                  <ProtectedRoute requireAnyCoach><AdminRegistrantsPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events/:id/waitlist" element={
                  <ProtectedRoute requireAnyCoach><AdminWaitlistPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events/:id/checkin" element={
                  <ProtectedRoute requireAnyCoach><AdminCheckinPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/admin/events/:id/volunteers" element={
                  <ProtectedRoute requireAnyCoach><AdminVolunteersPage /></ProtectedRoute>
                } />
                <Route path="/dashboard/superadmin" element={
                  <ProtectedRoute roles={["super_admin"]}><SuperAdminDojosPage /></ProtectedRoute>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
