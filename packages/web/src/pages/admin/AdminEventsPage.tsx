import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
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
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";
import { useAuth, roleInDojo } from "../../hooks/useAuth";
import { EventStatusChip } from "../../components/admin/EventStatusChip";

export function AdminEventsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const memberships = user?.memberships ?? [];
  const dojoId = params.get("dojoId") ?? memberships[0]?.dojoId ?? "";
  const myRole = roleInDojo(user, dojoId);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["adminEvents", dojoId],
    queryFn: () => api.get(`/admin/dojos/${dojoId}/events`).then((r) => r.data),
    enabled: !!dojoId,
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h5" fontWeight={700}>{t("nav.events")}</Typography>
        <Box display="flex" gap={2} alignItems="center">
          {memberships.length > 1 && (
            <TextField
              select
              size="small"
              label="Dojo"
              value={dojoId}
              onChange={(e) => setParams({ dojoId: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              {memberships.map((m) => (
                <MenuItem key={m.dojoId} value={m.dojoId}>
                  {m.dojoName} ({m.role === "lead_coach" ? "Lead Coach" : "Coach"})
                </MenuItem>
              ))}
            </TextField>
          )}
          {myRole === "lead_coach" && (
            <Button variant="contained" component={Link} to={`/dashboard/admin/events/new/edit?dojoId=${dojoId}`}>
              {t("admin.event_create")}
            </Button>
          )}
        </Box>
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
                <TableCell><EventStatusChip status={ev.status} /></TableCell>
                <TableCell>{ev.registrationCount} / {ev.maxCapacity - ev.coachReservedSeats}</TableCell>
                <TableCell>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/registrants`}>
                    {t("admin.registrants")}
                  </Button>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/checkin`}>
                    {t("admin.checkin.title")}
                  </Button>
                  {myRole === "lead_coach" && (
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
