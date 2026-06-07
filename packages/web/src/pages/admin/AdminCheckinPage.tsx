import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { api } from "../../lib/api";

export function AdminCheckinPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["adminRegistrations", eventId],
    queryFn: () =>
      api.get(`/admin/events/${eventId}/registrations`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const checkinMutation = useMutation({
    mutationFn: ({ registrationId, undo }: { registrationId: string; undo: boolean }) =>
      undo
        ? api.delete(`/admin/events/${eventId}/registrations/${registrationId}/checkin`)
        : api.patch(`/admin/events/${eventId}/registrations/${registrationId}/checkin`),
    onMutate: async ({ registrationId, undo }) => {
      await qc.cancelQueries({ queryKey: ["adminRegistrations", eventId] });
      const prev = qc.getQueryData(["adminRegistrations", eventId]);
      qc.setQueryData(["adminRegistrations", eventId], (old: any[]) =>
        (old ?? []).map((r) =>
          r.registrationId === registrationId ? { ...r, checkedIn: !undo } : r
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["adminRegistrations", eventId], ctx?.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["adminRegistrations", eventId] }),
  });

  const confirmed = useMemo(
    () => registrations.filter((r: any) => r.status === "confirmed"),
    [registrations]
  );

  const filtered = useMemo(() => {
    if (!search) return confirmed;
    const q = search.toLowerCase();
    return confirmed.filter(
      (r: any) =>
        r.ninjaName?.toLowerCase().includes(q) ||
        r.parentName?.toLowerCase().includes(q)
    );
  }, [confirmed, search]);

  const checkedInCount = confirmed.filter((r: any) => r.checkedIn).length;
  const notChecked = filtered.filter((r: any) => !r.checkedIn);
  const checkedIn = filtered.filter((r: any) => r.checkedIn);

  if (isLoading) return <LinearProgress />;

  return (
    <Box maxWidth={700} mx="auto">
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          {t("admin.checkin.title")}
        </Typography>
        <Button component={Link} to={`/dashboard/admin/events/${eventId}/registrants`} variant="outlined" size="small">
          {t("common.back")}
        </Button>
      </Box>

      <Box
        sx={{
          mb: 2,
          p: 2,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "white",
          textAlign: "center",
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          {checkedInCount} / {confirmed.length}
        </Typography>
        <Typography>{t("admin.checkin.counter", { count: checkedInCount, total: confirmed.length })}</Typography>
      </Box>

      <TextField
        fullWidth
        placeholder={t("admin.checkin.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {notChecked.map((reg: any) => (
        <Card key={reg.registrationId} sx={{ mb: 1 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <RadioButtonUncheckedIcon color="disabled" />
            <Box flexGrow={1}>
              <Typography fontWeight={600}>{reg.ninjaName}</Typography>
              <Typography variant="body2" color="text.secondary">{reg.parentName} · {reg.atelierId}</Typography>
            </Box>
            {reg.isCoachChild && <Chip label="Coach" size="small" color="info" />}
            <Button
              variant="contained"
              size="large"
              sx={{ minWidth: 110 }}
              onClick={() => checkinMutation.mutate({ registrationId: reg.registrationId, undo: false })}
              disabled={checkinMutation.isPending}
            >
              {t("admin.checkin.checked_in")}? ✓
            </Button>
          </CardContent>
        </Card>
      ))}

      {checkedIn.length > 0 && (
        <>
          <Divider sx={{ my: 2 }}>
            <Chip label={t("admin.checkin.checked_in")} color="success" size="small" />
          </Divider>
          {checkedIn.map((reg: any) => (
            <Card key={reg.registrationId} sx={{ mb: 1, bgcolor: "success.50", opacity: 0.8 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <CheckCircleIcon color="success" />
                <Box flexGrow={1}>
                  <Typography fontWeight={600}>{reg.ninjaName}</Typography>
                  <Typography variant="body2" color="text.secondary">{reg.parentName}</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  onClick={() => checkinMutation.mutate({ registrationId: reg.registrationId, undo: true })}
                  disabled={checkinMutation.isPending}
                >
                  {t("admin.checkin.undo")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Box>
  );
}
