import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api } from "../../lib/api";
import { EventCard } from "../../components/events/EventCard";

export function DojoEventsPage() {
  const { dojoId } = useParams<{ dojoId: string }>();
  const { t } = useTranslation();

  const { data: dojo, isLoading: dojoLoading } = useQuery({
    queryKey: ["dojo", dojoId],
    queryFn: () => api.get(`/dojos/${dojoId}`).then((r) => r.data),
    enabled: !!dojoId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["dojoEvents", dojoId],
    queryFn: () => api.get(`/dojos/${dojoId}/events`).then((r) => r.data),
    enabled: !!dojoId,
  });

  const isLoading = dojoLoading || eventsLoading;

  return (
    <Box>
      <Button
        component={Link}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        variant="text"
      >
        {t("common.back")}
      </Button>

      {dojoLoading ? (
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
      ) : (
        <>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            {dojo?.name}
          </Typography>
          <Typography color="text.secondary" mb={3}>
            {dojo?.city} · {dojo?.address}
          </Typography>
        </>
      )}

      <Typography variant="h5" fontWeight={600} mb={2}>
        {t("home.upcoming")}
      </Typography>

      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : events.length === 0 ? (
        <Alert severity="info">No upcoming events for this dojo.</Alert>
      ) : (
        <Grid container spacing={2}>
          {events.map((ev: any) => (
            <Grid item xs={12} sm={6} md={4} key={ev.eventId}>
              <EventCard
                eventId={ev.eventId}
                title={ev.title}
                date={ev.date}
                locationCity={ev.location?.city}
                maxCapacity={ev.maxCapacity}
                coachReservedSeats={ev.coachReservedSeats ?? 0}
                registrationCount={ev.registrationCount}
                waitlistCount={ev.waitlistCount}
                status={ev.status}
                ateliers={ev.ateliers}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
