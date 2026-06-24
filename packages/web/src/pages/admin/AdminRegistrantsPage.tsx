import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LaptopIcon from "@mui/icons-material/Laptop";
import { api } from "../../lib/api";
import { RegistrationStatusChip } from "../../components/registrations/RegistrationStatusChip";

export function AdminRegistrantsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["adminRegistrations", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/registrations`).then((r) => r.data),
  });

  if (isLoading) return <LinearProgress />;

  const confirmed = registrations.filter((r: any) => r.status === "confirmed");
  const waitlisted = registrations.filter((r: any) => r.status === "waitlisted");
  const laptopCount = confirmed.filter((r: any) => r.needsComputer).length;
  const dojoId = registrations[0]?.dojoId;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("admin.registrants")}</Typography>
          {laptopCount > 0 && (
            <Chip
              icon={<LaptopIcon />}
              label={t("admin.laptops_needed", { count: laptopCount })}
              color="warning"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="contained" component={Link} to={`/dashboard/admin/events/${eventId}/checkin`}>
            {t("admin.checkin.title")} ({confirmed.filter((r: any) => r.checkedIn).length}/{confirmed.length})
          </Button>
          <Button variant="outlined" component={Link} to={`/dashboard/admin/events/${eventId}/waitlist`}>
            {t("admin.waitlist")} ({waitlisted.length})
          </Button>
          <Button variant="outlined" component={Link} to={`/dashboard/admin/events/${eventId}/volunteers`}>
            {t("volunteers.title")}
          </Button>
          {dojoId && (
            <Button variant="outlined" component={Link} to={`/dashboard/admin/dojos/${dojoId}/participants`}>
              {t("admin.participants.title")}
            </Button>
          )}
        </Box>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ninja</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Atelier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell><LaptopIcon fontSize="small" titleAccess={t("registration.needs_computer")} /></TableCell>
              <TableCell>Check-in</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {registrations.map((reg: any) => (
              <TableRow key={reg.registrationId} sx={{ opacity: reg.status === "waitlisted" ? 0.7 : 1 }}>
                <TableCell>
                  {reg.childId ? (
                    <Link to={`/dashboard/admin/children/${reg.childId}`}>{reg.ninjaName}</Link>
                  ) : (
                    reg.ninjaName
                  )}
                </TableCell>
                <TableCell>{reg.parentName}</TableCell>
                <TableCell>{reg.atelierId}</TableCell>
                <TableCell>
                  <RegistrationStatusChip
                    status={reg.status}
                    isCoachChild={reg.isCoachChild}
                    checkedIn={reg.checkedIn}
                  />
                </TableCell>
                <TableCell>
                  {reg.needsComputer && <LaptopIcon fontSize="small" color="action" />}
                </TableCell>
                <TableCell>
                  {reg.checkedIn && <CheckCircleIcon color="success" fontSize="small" />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
