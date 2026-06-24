import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";
import { RegistrationStatusChip } from "../../components/registrations/RegistrationStatusChip";

interface Reg {
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

export function AdminChildHistoryPage() {
  const { childId } = useParams<{ childId: string }>();
  const { t } = useTranslation();

  const { data: regs = [], isLoading } = useQuery<Reg[]>({
    queryKey: ["childHistory", childId],
    queryFn: () => api.get(`/admin/children/${childId}/registrations`).then((r) => r.data),
  });

  const uniqueEventIds = [...new Set(regs.map((r) => r.eventId))];
  const { data: eventsById = {} } = useQuery<Record<string, Event>>({
    queryKey: ["childHistoryEvents", uniqueEventIds.join(",")],
    queryFn: async () => {
      const events = await Promise.all(
        uniqueEventIds.map((id) => api.get(`/events/${id}`).then((r) => r.data as Event))
      );
      return Object.fromEntries(events.map((e) => [e.eventId, e]));
    },
    enabled: uniqueEventIds.length > 0,
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t("admin.child_history.title")}</Typography>
      {regs[0] && <Typography color="text.secondary" sx={{ mb: 3 }}>{regs[0].ninjaName}</Typography>}

      {regs.length === 0 ? (
        <Typography color="text.secondary">{t("admin.child_history.none")}</Typography>
      ) : (
        regs.map((reg) => {
          const event = eventsById[reg.eventId];
          const atelierName = event?.ateliers?.find((a) => a.atelierId === reg.atelierId)?.name ?? reg.atelierId;
          return (
            <Card key={reg.registrationId} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <Typography sx={{ fontWeight: 600 }}>{event?.title ?? "…"}</Typography>
                  <RegistrationStatusChip
                    status={reg.status}
                    isCoachChild={reg.isCoachChild}
                    checkedIn={reg.checkedIn}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {event
                    ? `${new Date(event.date).toLocaleDateString(undefined, { dateStyle: "medium" })}${event.location?.city ? ` · ${event.location.city}` : ""}`
                    : ""}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={atelierName} size="small" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          );
        })
      )}
    </Box>
  );
}
