import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export function AdminEventsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["adminEvents", user?.dojoId],
    queryFn: () =>
      api.get(`/dojos/${user?.dojoId}/events`).then((r) => r.data),
    enabled: !!user?.dojoId,
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>{t("nav.events")}</Typography>
        {(user?.role === "lead_coach") && (
          <Button
            variant="contained"
            component={Link}
            to={`/dashboard/admin/events/new/edit`}
          >
            {t("admin.event_create")}
          </Button>
        )}
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Registrations</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev: any) => (
              <TableRow key={ev.eventId}>
                <TableCell>{ev.title}</TableCell>
                <TableCell>{new Date(ev.date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip label={ev.status} size="small"
                    color={ev.status === "published" ? "success" : ev.status === "cancelled" ? "error" : "default"}
                  />
                </TableCell>
                <TableCell>{ev.registrationCount} / {ev.maxCapacity - ev.coachReservedSeats}</TableCell>
                <TableCell>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/registrants`}>
                    {t("admin.registrants")}
                  </Button>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/checkin`}>
                    {t("admin.checkin.title")}
                  </Button>
                  {user?.role === "lead_coach" && (
                    <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/edit`}>
                      {t("common.edit")}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
