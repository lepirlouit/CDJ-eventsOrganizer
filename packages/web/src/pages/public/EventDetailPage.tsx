import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { api } from "../../lib/api";
import { useAuth, isAnyCoach } from "../../hooks/useAuth";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
    enabled: !!eventId,
  });

  const myVolunteer = useQuery({
    queryKey: ["myVolunteer", eventId],
    queryFn: () =>
      api.get(`/admin/events/${eventId}/volunteers`).then((r) =>
        r.data.find((v: any) => v.userId === user?.sub && v.status === "active")
      ),
    enabled: !!user && isAnyCoach(user),
  });

  const volunteerMutation = useMutation({
    mutationFn: () => api.post(`/events/${eventId}/volunteers`, { lang: i18n.language }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myVolunteer", eventId] }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => api.delete(`/events/${eventId}/volunteers/me`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myVolunteer", eventId] }),
  });

  if (isLoading) return <LinearProgress />;
  if (!event) return <Alert severity="error">Event not found</Alert>;

  const isCoach = isAnyCoach(user);
  const generalAvailable = event.maxCapacity - event.coachReservedSeats - event.registrationCount;
  const coachAvailable = event.coachReservedSeats - event.coachRegistrationCount;
  const isFull = generalAvailable <= 0;
  const isPublished = event.status === "published";
  const now = new Date().toISOString();
  const regOpen = now >= event.registrationOpenAt && now <= event.registrationCloseAt;

  return (
    <Box maxWidth={700} mx="auto">
      <Typography variant="h4" fontWeight={700} mb={1}>{event.title}</Typography>
      <Typography color="text.secondary" mb={3}>{event.description}</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack spacing={1.5}>
            <Box display="flex" gap={2}>
              <Typography fontWeight={600} minWidth={100}>Date</Typography>
              <Typography>{new Date(event.date).toLocaleDateString("en-BE", { dateStyle: "full" })}</Typography>
            </Box>
            <Box display="flex" gap={2}>
              <Typography fontWeight={600} minWidth={100}>Location</Typography>
              <Typography>{event.location?.address}, {event.location?.city}</Typography>
            </Box>
            <Divider />
            <Box display="flex" gap={2} alignItems="center">
              <Typography fontWeight={600} minWidth={100}>Capacity</Typography>
              <Box flexGrow={1}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (event.registrationCount / (event.maxCapacity - event.coachReservedSeats)) * 100)}
                  sx={{ borderRadius: 4, height: 8 }}
                />
              </Box>
              <Chip
                label={isFull ? t("events.full") : t("events.available", { count: generalAvailable })}
                color={isFull ? "error" : "success"}
                size="small"
              />
            </Box>
            {event.coachReservedSeats > 0 && (
              <Typography variant="body2" color="text.secondary">
                {t("events.coach_reserved_seats", { count: event.coachReservedSeats })}
                {isCoach && coachAvailable > 0 && ` · ${t("events.coach_reserved_available", { count: coachAvailable })}`}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {event.ateliers && event.ateliers.length > 0 && (
        <Box mb={3}>
          <Typography variant="h6" mb={1}>Ateliers</Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {event.ateliers.map((a: any) => (
              <Chip key={a.atelierId} label={a.name} />
            ))}
          </Box>
        </Box>
      )}

      {isPublished && regOpen && (
        <Button
          variant="contained"
          size="large"
          fullWidth
          component={Link}
          to={`/register/${eventId}`}
          sx={{ mb: 2 }}
        >
          {isFull ? t("events.waitlist") : t("events.register")}
        </Button>
      )}

      {isCoach && isPublished && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" mb={1}>{t("volunteers.title")}</Typography>
            {myVolunteer.data ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Chip label={t("volunteers.signed_up")} color="success" />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending}
                >
                  {t("volunteers.withdraw")}
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                onClick={() => volunteerMutation.mutate()}
                disabled={volunteerMutation.isPending}
              >
                {t("volunteers.sign_up")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Button component={Link} to="/" variant="text">
        {t("common.back")}
      </Button>
    </Box>
  );
}
