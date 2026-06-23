import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

interface Participant {
  participantId: string;
  name: string;
  birthdate: string;
  gender?: "boy" | "girl" | "other" | "prefer_not_to_say";
  parentName?: string;
  parentPhone?: string;
  childIds: string[];
  visits: number;
  confirmedVisits: number;
  mergeCandidate: boolean;
}

export function AdminParticipantsPage() {
  const { dojoId } = useParams<{ dojoId: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ participants: Participant[] }>({
    queryKey: ["participants", dojoId],
    queryFn: () => api.get(`/admin/dojos/${dojoId}/participants`).then((r) => r.data),
  });

  const mergeMutation = useMutation({
    mutationFn: (childIds: string[]) => api.post("/admin/participants/merge", { childIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["participants", dojoId] }),
  });

  if (isLoading) return <LinearProgress />;
  const participants = data?.participants ?? [];

  // Group merge candidates by normalized name+birthdate so a merge collects all duplicates.
  const groupKey = (p: Participant) => `${p.name.trim().toLowerCase()}|${p.birthdate}`;
  const candidatesByKey = new Map<string, Participant[]>();
  for (const p of participants) {
    if (!p.mergeCandidate) continue;
    const arr = candidatesByKey.get(groupKey(p)) ?? [];
    arr.push(p);
    candidatesByKey.set(groupKey(p), arr);
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>{t("admin.participants.title")}</Typography>
      <Typography color="text.secondary" mb={3}>
        {t("admin.participants.unique_count", { count: participants.length })}
      </Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("children.name")}</TableCell>
              <TableCell>{t("children.birthdate")}</TableCell>
              <TableCell>{t("children.gender")}</TableCell>
              <TableCell>{t("registration.phone")}</TableCell>
              <TableCell>{t("admin.participants.visits")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((p) => {
              const candidates = candidatesByKey.get(groupKey(p)) ?? [];
              const mergeChildIds = [...new Set(candidates.flatMap((c) => c.childIds))];
              return (
                <TableRow key={p.participantId}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      {p.childIds[0] ? (
                        <Link to={`/dashboard/admin/children/${p.childIds[0]}`}>{p.name}</Link>
                      ) : (
                        p.name
                      )}
                      {p.mergeCandidate && (
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={t("admin.participants.merge_candidate")}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{new Date(p.birthdate).toLocaleDateString()}</TableCell>
                  <TableCell>{p.gender ? t(`children.gender_${p.gender}`) : "—"}</TableCell>
                  <TableCell>{p.parentPhone || "—"}</TableCell>
                  <TableCell>{p.confirmedVisits}</TableCell>
                  <TableCell align="right">
                    {p.mergeCandidate && mergeChildIds.length > 1 && (
                      <Button
                        size="small"
                        disabled={mergeMutation.isPending}
                        onClick={() => {
                          if (window.confirm(t("admin.participants.merge_confirm"))) {
                            mergeMutation.mutate(mergeChildIds);
                          }
                        }}
                      >
                        {t("admin.participants.merge")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
