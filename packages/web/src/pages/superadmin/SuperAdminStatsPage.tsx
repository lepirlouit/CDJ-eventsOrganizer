import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

type GenderKey = "boy" | "girl" | "other" | "prefer_not_to_say" | "unknown";
const GENDERS: GenderKey[] = ["boy", "girl", "other", "prefer_not_to_say", "unknown"];

interface Stats {
  total: number;
  global: Record<GenderKey, number>;
  perDojo: { dojoId: string; name: string; total: number; breakdown: Record<GenderKey, number> }[];
}

export function SuperAdminStatsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["adminStats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
  });

  if (isLoading) return <LinearProgress />;
  if (!data) return null;

  const genderLabel = (g: GenderKey) =>
    g === "unknown" ? t("children.gender_unknown") : t(`children.gender_${g}`);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t("stats.title")}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t("stats.total")}: {data.total}
      </Typography>

      <Typography variant="h6" sx={{ mb: 1 }}>{t("stats.by_gender")}</Typography>
      <Paper sx={{ mb: 4 }}>
        <Table size="small">
          <TableBody>
            {GENDERS.map((g) => (
              <TableRow key={g}>
                <TableCell>{genderLabel(g)}</TableCell>
                <TableCell align="right">{data.global[g]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="h6" sx={{ mb: 1 }}>{t("stats.per_dojo")}</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("stats.dojo")}</TableCell>
              {GENDERS.map((g) => (
                <TableCell key={g} align="right">{genderLabel(g)}</TableCell>
              ))}
              <TableCell align="right">{t("stats.total_col")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.perDojo.map((d) => (
              <TableRow key={d.dojoId}>
                <TableCell>{d.name}</TableCell>
                {GENDERS.map((g) => (
                  <TableCell key={g} align="right">{d.breakdown[g]}</TableCell>
                ))}
                <TableCell align="right">{d.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
