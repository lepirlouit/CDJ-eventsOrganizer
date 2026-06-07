import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

export function AdminVolunteersPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ["volunteers", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/volunteers`).then((r) => r.data),
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        {t("volunteers.title")} ({t("volunteers.count", { count: volunteers.length })})
      </Typography>
      {volunteers.length === 0 ? (
        <Typography color="text.secondary">{t("volunteers.no_volunteers")}</Typography>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Coach</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>{t("volunteers.skills")}</TableCell>
                <TableCell>Signed up</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {volunteers.map((v: any) => (
                <TableRow key={v.userId}>
                  <TableCell>{v.coachName}</TableCell>
                  <TableCell>{v.coachEmail}</TableCell>
                  <TableCell>{v.skills ?? "—"}</TableCell>
                  <TableCell>{new Date(v.signedUpAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
