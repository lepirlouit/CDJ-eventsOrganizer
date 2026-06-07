import React, { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { api } from "../../lib/api";
import { DojoMap } from "../../components/map/DojoMap";

interface Dojo {
  dojoId: string;
  name: string;
  city: string;
  address: string;
  active: boolean;
  latitude?: number;
  longitude?: number;
}

interface DojoEvent {
  eventId: string;
  dojoId: string;
  title: string;
  date: string;
  registrationCount: number;
  maxCapacity: number;
  coachReservedSeats: number;
  status: string;
}

export function HomePage() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [selectedDojoId, setSelectedDojoId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { data: dojos = [], isLoading } = useQuery<Dojo[]>({
    queryKey: ["dojos"],
    queryFn: () => api.get("/dojos").then((r) => r.data.filter((d: Dojo) => d.active)),
  });

  const { data: eventsByDojo = {} } = useQuery<Record<string, DojoEvent[]>>({
    queryKey: ["allDojoEvents", dojos.map((d) => d.dojoId).join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        dojos.map((d) =>
          api.get(`/dojos/${d.dojoId}/events`).then((r) => ({ dojoId: d.dojoId, events: r.data as DojoEvent[] }))
        )
      );
      return Object.fromEntries(results.map((r) => [r.dojoId, r.events]));
    },
    enabled: dojos.length > 0,
  });

  const handleMarkerClick = useCallback((dojoId: string) => {
    setSelectedDojoId(dojoId);
    cardRefs.current[dojoId]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const handleCardClick = useCallback((dojoId: string) => {
    setSelectedDojoId(dojoId);
  }, []);

  const mapSection = (
    <Box sx={{ height: isMobile ? 280 : "calc(100vh - 80px)", position: isMobile ? "relative" : "sticky", top: isMobile ? "auto" : 80 }}>
      <DojoMap dojos={dojos} selectedDojoId={selectedDojoId} onMarkerClick={handleMarkerClick} />
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>
        {t("home.map_title")}
      </Typography>
      <Grid container spacing={3}>
        {!isMobile && (
          <Grid item xs={12} md={5}>
            {mapSection}
          </Grid>
        )}
        <Grid item xs={12} md={isMobile ? 12 : 7}>
          {isMobile && <Box mb={2}>{mapSection}</Box>}
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={140} sx={{ mb: 2, borderRadius: 2 }} />
            ))
          ) : dojos.length === 0 ? (
            <Typography color="text.secondary">{t("home.no_dojos")}</Typography>
          ) : (
            dojos.map((dojo) => {
              const events = (eventsByDojo[dojo.dojoId] ?? []).slice(0, 3);
              const isSelected = selectedDojoId === dojo.dojoId;
              return (
                <Card
                  key={dojo.dojoId}
                  ref={(el) => { cardRefs.current[dojo.dojoId] = el; }}
                  onClick={() => handleCardClick(dojo.dojoId)}
                  sx={{
                    mb: 2,
                    cursor: "pointer",
                    border: 2,
                    borderColor: isSelected ? "primary.main" : "transparent",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: "primary.light" },
                  }}
                  elevation={isSelected ? 4 : 1}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600}>
                      {dojo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {dojo.city}
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {events.map((ev) => {
                        const available = ev.maxCapacity - ev.coachReservedSeats - ev.registrationCount;
                        return (
                          <Chip
                            key={ev.eventId}
                            label={`${new Date(ev.date).toLocaleDateString()} — ${available > 0 ? `${available} spots` : "Full"}`}
                            size="small"
                            color={available > 0 ? "default" : "error"}
                            variant="outlined"
                          />
                        );
                      })}
                      {events.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No upcoming events
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={Link}
                      to={`/dojos/${dojo.dojoId}/events`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("home.see_events")}
                    </Button>
                  </CardActions>
                </Card>
              );
            })
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
