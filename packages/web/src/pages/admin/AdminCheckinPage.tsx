import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { api } from "../../lib/api";

export function AdminCheckinPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: registrations = [], isLoading: loadingReg } = useQuery({
    queryKey: ["adminRegistrations", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/registrations`).then((r) => r.data),
    refetchInterval: 15_000,
  });

  const { data: volunteers = [], isLoading: loadingVol } = useQuery({
    queryKey: ["volunteers", eventId],
    queryFn: () => api.get(`/admin/events/${eventId}/volunteers`).then((r) => r.data),
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

  const volunteerCheckinMutation = useMutation({
    mutationFn: ({ userId, checkedIn }: { userId: string; checkedIn: boolean }) =>
      api.patch(`/admin/events/${eventId}/volunteers/${userId}/checkin`, { checkedIn }),
    onMutate: async ({ userId, checkedIn }) => {
      await qc.cancelQueries({ queryKey: ["volunteers", eventId] });
      const prev = qc.getQueryData(["volunteers", eventId]);
      qc.setQueryData(["volunteers", eventId], (old: any[]) =>
        (old ?? []).map((v) => (v.userId === userId ? { ...v, checkedIn } : v))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["volunteers", eventId], ctx?.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["volunteers", eventId] }),
  });

  const confirmed = useMemo(
    () => registrations.filter((r: any) => r.status === "confirmed"),
    [registrations]
  );

  const q = search.toLowerCase();

  const filteredNinjas = useMemo(() => {
    if (!q) return confirmed;
    return confirmed.filter(
      (r: any) =>
        r.ninjaName?.toLowerCase().includes(q) ||
        r.parentName?.toLowerCase().includes(q)
    );
  }, [confirmed, q]);

  const filteredVolunteers = useMemo(() => {
    if (!q) return volunteers;
    return volunteers.filter((v: any) => v.coachName?.toLowerCase().includes(q));
  }, [volunteers, q]);

  const ninjaCheckedIn = confirmed.filter((r: any) => r.checkedIn).length;
  const coachCheckedIn = volunteers.filter((v: any) => v.checkedIn).length;
  const totalCheckedIn = ninjaCheckedIn + coachCheckedIn;
  const totalPresent = confirmed.length + volunteers.length;

  const notChecked = filteredNinjas.filter((r: any) => !r.checkedIn);
  const checkedIn = filteredNinjas.filter((r: any) => r.checkedIn);
  const coachesNotChecked = filteredVolunteers.filter((v: any) => !v.checkedIn);
  const coachesCheckedIn = filteredVolunteers.filter((v: any) => v.checkedIn);

  if (loadingReg || loadingVol) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {t("admin.checkin.title")}
        </Typography>
        <Button onClick={() => navigate(-1)} variant="outlined" size="small">
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
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {totalCheckedIn} / {totalPresent}
        </Typography>
        <Typography>{t("admin.checkin.counter", { count: totalCheckedIn, total: totalPresent })}</Typography>
        {volunteers.length > 0 && (
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
            {ninjaCheckedIn}/{confirmed.length} ninjas · {coachCheckedIn}/{volunteers.length} coaches
          </Typography>
        )}
      </Box>

      <TextField
        fullWidth
        placeholder={t("admin.checkin.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {notChecked.map((reg: any) => (
        <Card key={reg.registrationId} sx={{ mb: 1 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <RadioButtonUncheckedIcon color="disabled" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>{reg.ninjaName}</Typography>
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

      {coachesNotChecked.length > 0 && (
        <>
          <Divider sx={{ my: 2 }}>
            <Chip label="Coaches" size="small" color="info" />
          </Divider>
          {coachesNotChecked.map((vol: any) => (
            <Card key={vol.userId} sx={{ mb: 1 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <RadioButtonUncheckedIcon color="disabled" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{vol.coachName}</Typography>
                  <Typography variant="body2" color="text.secondary">{vol.coachEmail}</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  sx={{ minWidth: 110 }}
                  onClick={() => volunteerCheckinMutation.mutate({ userId: vol.userId, checkedIn: true })}
                  disabled={volunteerCheckinMutation.isPending}
                >
                  {t("admin.checkin.checked_in")}? ✓
                </Button>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      {(checkedIn.length > 0 || coachesCheckedIn.length > 0) && (
        <>
          <Divider sx={{ my: 2 }}>
            <Chip label={t("admin.checkin.checked_in")} color="success" size="small" />
          </Divider>
          {checkedIn.map((reg: any) => (
            <Card key={reg.registrationId} sx={{ mb: 1, bgcolor: "success.50", opacity: 0.8 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <CheckCircleIcon color="success" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{reg.ninjaName}</Typography>
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
          {coachesCheckedIn.map((vol: any) => (
            <Card key={vol.userId} sx={{ mb: 1, bgcolor: "success.50", opacity: 0.8 }}>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <CheckCircleIcon color="success" />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>{vol.coachName}</Typography>
                  <Typography variant="body2" color="text.secondary">{vol.coachEmail}</Typography>
                </Box>
                <Chip label="Coach" size="small" color="info" sx={{ mr: 1 }} />
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  onClick={() => volunteerCheckinMutation.mutate({ userId: vol.userId, checkedIn: false })}
                  disabled={volunteerCheckinMutation.isPending}
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
