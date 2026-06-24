import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { RegistrationStatusChip } from "../../components/registrations/RegistrationStatusChip";

interface Registration {
  registrationId: string;
  eventId: string;
  ninjaName: string;
  atelierId: string;
  status: "confirmed" | "waitlisted" | "cancelled";
  isCoachChild?: boolean;
  checkedIn?: boolean;
}

interface Event {
  eventId: string;
  title: string;
  date: string;
  location?: { city?: string };
  ateliers?: { atelierId: string; name: string }[];
}

export function MyRegistrationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { logout } = useAuth();

  // ── GDPR: download my data / erase my data ─────────────────────────────────
  async function downloadMyData() {
    const { data } = await api.get("/users/me/data-export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-coderdojo-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const eraseMutation = useMutation({
    mutationFn: () => api.delete("/users/me"),
    onSuccess: () => logout(),
  });

  const { data: registrations = [], isLoading: regsLoading } = useQuery<Registration[]>({
    queryKey: ["myRegistrations"],
    queryFn: () => api.get("/users/me/registrations").then((r) => r.data),
  });

  // Fetch event details for each unique eventId
  const uniqueEventIds = [...new Set(registrations.map((r) => r.eventId))];
  const { data: eventsById = {} } = useQuery<Record<string, Event>>({
    queryKey: ["myRegistrationEvents", uniqueEventIds.join(",")],
    queryFn: async () => {
      const events = await Promise.all(
        uniqueEventIds.map((id) => api.get(`/events/${id}`).then((r) => r.data as Event))
      );
      return Object.fromEntries(events.map((e) => [e.eventId, e]));
    },
    enabled: uniqueEventIds.length > 0,
  });

  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) => api.delete(`/registrations/${registrationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myRegistrations"] }),
  });

  if (regsLoading) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>{t("nav.my_registrations")}</Typography>
      {registrations.length === 0 ? (
        <Typography color="text.secondary">{t("registration.none_yet")}</Typography>
      ) : (
        registrations.map((reg) => {
          const event = eventsById[reg.eventId];
          const atelierName = event?.ateliers?.find((a) => a.atelierId === reg.atelierId)?.name ?? reg.atelierId;

          return (
            <Card key={reg.registrationId} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 600 }}>{reg.ninjaName}</Typography>
                  <RegistrationStatusChip
                    status={reg.status}
                    isCoachChild={reg.isCoachChild}
                    checkedIn={reg.checkedIn}
                  />
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {event?.title ?? "…"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {event
                    ? `${new Date(event.date).toLocaleDateString(undefined, { dateStyle: "medium" })}${event.location?.city ? ` · ${event.location.city}` : ""}`
                    : ""}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={atelierName} size="small" variant="outlined" />
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="error"
                  onClick={() => cancelMutation.mutate(reg.registrationId)}
                  disabled={cancelMutation.isPending || reg.status === "cancelled"}
                >
                  {t("common.cancel")}
                </Button>
              </CardActions>
            </Card>
          );
        })
      )}

      {/* ── Privacy / GDPR ────────────────────────────────────────────────── */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>{t("privacy.title")}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t("privacy.help")}</Typography>
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="outlined" onClick={downloadMyData}>{t("privacy.export")}</Button>
        <Button
          variant="outlined"
          color="error"
          disabled={eraseMutation.isPending}
          onClick={() => {
            if (window.confirm(t("privacy.erase_confirm"))) eraseMutation.mutate();
          }}
        >
          {t("privacy.erase")}
        </Button>
      </Box>
    </Box>
  );
}
