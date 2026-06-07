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
    <Box maxWidth={700} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>My Registrations</Typography>
      {registrations.length === 0 ? (
        <Typography color="text.secondary">No registrations yet.</Typography>
      ) : (
        registrations.map((reg) => {
          const event = eventsById[reg.eventId];
          const atelierName = event?.ateliers?.find((a) => a.atelierId === reg.atelierId)?.name ?? reg.atelierId;

          return (
            <Card key={reg.registrationId} sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                  <Typography fontWeight={600}>{reg.ninjaName}</Typography>
                  <RegistrationStatusChip
                    status={reg.status}
                    isCoachChild={reg.isCoachChild}
                    checkedIn={reg.checkedIn}
                  />
                </Box>
                <Typography variant="body1" fontWeight={500}>
                  {event?.title ?? "…"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {event
                    ? `${new Date(event.date).toLocaleDateString(undefined, { dateStyle: "medium" })}${event.location?.city ? ` · ${event.location.city}` : ""}`
                    : ""}
                </Typography>
                <Box mt={1}>
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
    </Box>
  );
}
