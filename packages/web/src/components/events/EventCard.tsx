import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";

interface EventCardProps {
  eventId: string;
  title: string;
  date: string;
  locationCity?: string;
  maxCapacity: number;
  coachReservedSeats: number;
  registrationCount: number;
  waitlistCount: number;
  status: string;
  ateliers?: { atelierId: string; name: string }[];
}

export function EventCard({
  eventId,
  title,
  date,
  locationCity,
  maxCapacity,
  coachReservedSeats,
  registrationCount,
  waitlistCount,
  status,
  ateliers = [],
}: EventCardProps) {
  const { t } = useTranslation();
  const generalCapacity = maxCapacity - coachReservedSeats;
  const available = generalCapacity - registrationCount;
  const isFull = available <= 0;
  const fillPercent = Math.min(100, (registrationCount / generalCapacity) * 100);

  return (
    <Card elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
          <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
            {title}
          </Typography>
          <Chip
            label={status}
            size="small"
            color={status === "published" ? "success" : status === "cancelled" ? "error" : "default"}
            sx={{ ml: 1, flexShrink: 0 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={1}>
          {new Date(date).toLocaleDateString(undefined, { dateStyle: "full" })}
          {locationCity && ` · ${locationCity}`}
        </Typography>

        <Box mb={1}>
          <LinearProgress
            variant="determinate"
            value={fillPercent}
            color={isFull ? "error" : fillPercent > 80 ? "warning" : "primary"}
            sx={{ borderRadius: 4, height: 6, mb: 0.5 }}
          />
          <Typography variant="caption" color="text.secondary">
            {isFull
              ? t("events.full")
              : t("events.available", { count: available })}
            {waitlistCount > 0 && ` · ${waitlistCount} on waitlist`}
          </Typography>
        </Box>

        {coachReservedSeats > 0 && (
          <Typography variant="caption" color="info.main" display="block" mb={1}>
            {t("events.coach_reserved_seats", { count: coachReservedSeats })}
          </Typography>
        )}

        {ateliers.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {ateliers.slice(0, 4).map((a) => (
              <Chip key={a.atelierId} label={a.name} size="small" variant="outlined" />
            ))}
            {ateliers.length > 4 && (
              <Chip label={`+${ateliers.length - 4}`} size="small" variant="outlined" />
            )}
          </Box>
        )}
      </CardContent>

      <CardActions>
        <Button size="small" component={Link} to={`/events/${eventId}`}>
          {isFull ? t("events.waitlist") : t("events.register")}
        </Button>
      </CardActions>
    </Card>
  );
}
