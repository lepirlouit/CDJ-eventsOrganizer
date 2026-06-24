import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import IconButton from "@mui/material/IconButton";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { api } from "../../lib/api";

export function AdminVolunteersPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ["volunteers", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/volunteers`).then((r) => r.data),
  });

  const checkinMutation = useMutation({
    mutationFn: ({ userId, checkedIn }: { userId: string; checkedIn: boolean }) =>
      api.patch(`/admin/events/${eventId}/volunteers/${userId}/checkin`, { checkedIn }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", eventId] }),
  });

  if (isLoading) return <LinearProgress />;

  const checkedInCount = volunteers.filter((v: any) => v.checkedIn).length;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        {t("volunteers.title")} ({checkedInCount}/{volunteers.length} {t("admin.checkin.checked_in").toLowerCase()})
      </Typography>
      {volunteers.length === 0 ? (
        <Typography color="text.secondary">{t("volunteers.no_volunteers")}</Typography>
      ) : (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("admin.checkin.title")}</TableCell>
                <TableCell>Coach</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>{t("volunteers.skills")}</TableCell>
                <TableCell>Signed up</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {volunteers.map((v: any) => (
                <TableRow key={v.userId} sx={{ bgcolor: v.checkedIn ? "success.50" : undefined }}>
                  <TableCell sx={{ width: 48 }}>
                    <IconButton
                      size="small"
                      color={v.checkedIn ? "success" : "default"}
                      onClick={() => checkinMutation.mutate({ userId: v.userId, checkedIn: !v.checkedIn })}
                      disabled={checkinMutation.isPending}
                    >
                      {v.checkedIn
                        ? <CheckCircleIcon />
                        : <RadioButtonUncheckedIcon />}
                    </IconButton>
                  </TableCell>
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
