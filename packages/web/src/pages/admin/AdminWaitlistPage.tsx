import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

export function AdminWaitlistPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: waitlist = [], isLoading } = useQuery({
    queryKey: ["waitlist", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/waitlist`).then((r) => r.data),
  });

  const promoteMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/admin/events/${eventId}/waitlist/${id}/promote`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist", eventId] });
      qc.invalidateQueries({ queryKey: ["adminRegistrations", eventId] });
    },
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>{t("admin.waitlist")}</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Ninja</TableCell>
              <TableCell>Parent</TableCell>
              <TableCell>Atelier</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {waitlist.map((entry: any) => (
              <TableRow key={entry.waitlistId}>
                <TableCell>{entry.position}</TableCell>
                <TableCell>{entry.ninjaName}</TableCell>
                <TableCell>{entry.parentName}</TableCell>
                <TableCell>{entry.atelierId}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => promoteMutation.mutate(entry.waitlistId)}
                    disabled={promoteMutation.isPending}
                  >
                    {t("admin.promote")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
