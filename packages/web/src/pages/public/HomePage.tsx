import React, { useState, useRef, useCallback, useMemo } from "react";
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
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import IconButton from "@mui/material/IconButton";
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
  const [search, setSearch] = useState("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Single call for all dojos
  const { data: dojos = [], isLoading: dojosLoading } = useQuery<Dojo[]>({
    queryKey: ["dojos"],
    queryFn: () => api.get("/dojos").then((r) => r.data.filter((d: Dojo) => d.active)),
  });

  // Single call for ALL upcoming events across every dojo
  const { data: allEvents = [], isLoading: eventsLoading } = useQuery<DojoEvent[]>({
    queryKey: ["upcomingEvents"],
    queryFn: () => api.get("/events").then((r) => r.data),
  });

  // Filter dojos by search query (name or city)
  const filteredDojos = useMemo(() => {
    if (!search.trim()) return dojos;
    const q = search.toLowerCase();
    return dojos.filter(
      (d) => d.name.toLowerCase().includes(q) || d.city.toLowerCase().includes(q)
    );
  }, [dojos, search]);

  // Group events by dojoId client-side — O(n), no extra requests
  const eventsByDojo = useMemo(() => {
    const map: Record<string, DojoEvent[]> = {};
    for (const ev of allEvents) {
      if (!map[ev.dojoId]) map[ev.dojoId] = [];
      map[ev.dojoId].push(ev);
    }
    return map;
  }, [allEvents]);

  const isLoading = dojosLoading || eventsLoading;

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

          <TextField
            fullWidth
            size="small"
            placeholder={t("home.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch("")} edge="end">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={140} sx={{ mb: 2, borderRadius: 2 }} />
            ))
          ) : filteredDojos.length === 0 ? (
            <Typography color="text.secondary">
              {search ? t("home.no_results") : t("home.no_dojos")}
            </Typography>
          ) : (
            filteredDojos.map((dojo) => {
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
