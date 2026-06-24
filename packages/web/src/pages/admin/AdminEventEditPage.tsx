import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string().min(1),
  locationAddress: z.string().min(1),
  locationCity: z.string().min(1),
  maxCapacity: z.coerce.number().int().min(1),
  coachReservedSeats: z.coerce.number().int().min(0).default(0),
  registrationOpenAt: z.string().min(1),
  registrationCloseAt: z.string().min(1),
  status: z.enum(["draft", "published", "cancelled", "completed"]),
});
type FormData = z.infer<typeof schema>;

interface DojoLocation {
  locationId: string;
  name: string;
  address: string;
  city: string;
}

interface DojoTrack {
  trackId: string;
  name: string;
  active: boolean;
}

// Per-track selection state for the event: whether it's enabled and its seat cap.
type TrackSelection = Record<string, { selected: boolean; maxSeats: string }>;

export function AdminEventEditPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = eventId === "new";
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dojoId = searchParams.get("dojoId") ?? "";

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
    enabled: !isNew && !!eventId,
  });

  // Load dojo locations for the picker
  const resolvedDojoId = dojoId || event?.dojoId || "";
  const { data: dojo } = useQuery({
    queryKey: ["dojo", resolvedDojoId],
    queryFn: () => api.get(`/dojos/${resolvedDojoId}`).then((r) => r.data),
    enabled: !!resolvedDojoId,
  });
  const dojoLocations: DojoLocation[] = dojo?.locations ?? [];
  const dojoTracks: DojoTrack[] = (dojo?.tracks ?? []).filter((tr: DojoTrack) => tr.active);

  // Available track options = active dojo tracks, plus any tracks already on the
  // event (so editing an event keeps tracks even if they were since deactivated).
  const eventAteliers: { atelierId: string; name: string; maxSeats?: number }[] = event?.ateliers ?? [];
  const trackOptions = [
    ...dojoTracks.map((tr) => ({ atelierId: tr.trackId, name: tr.name })),
    ...eventAteliers
      .filter((a) => !dojoTracks.some((tr) => tr.trackId === a.atelierId))
      .map((a) => ({ atelierId: a.atelierId, name: a.name })),
  ];

  const [tracks, setTracks] = useState<TrackSelection>({});

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: "draft", coachReservedSeats: 0, maxCapacity: 30 },
  });

  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description ?? "",
        date: event.date,
        locationAddress: event.location?.address ?? "",
        locationCity: event.location?.city ?? "",
        maxCapacity: event.maxCapacity,
        coachReservedSeats: event.coachReservedSeats ?? 0,
        registrationOpenAt: event.registrationOpenAt?.slice(0, 16) ?? "",
        registrationCloseAt: event.registrationCloseAt?.slice(0, 16) ?? "",
        status: event.status,
      });
      // Prefill track selection from the event's existing ateliers.
      const sel: TrackSelection = {};
      for (const a of event.ateliers ?? []) {
        sel[a.atelierId] = { selected: true, maxSeats: a.maxSeats != null ? String(a.maxSeats) : "" };
      }
      setTracks(sel);
    }
  }, [event, reset]);

  function applyLocation(loc: DojoLocation) {
    setValue("locationAddress", loc.address);
    setValue("locationCity", loc.city);
  }

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const selectedAteliers = Object.entries(tracks)
        .filter(([, v]) => v.selected)
        .map(([atelierId, v]) => ({
          atelierId,
          ...(v.maxSeats.trim() !== "" && { maxSeats: Number(v.maxSeats) }),
        }));
      const payload = {
        title: data.title,
        description: data.description,
        date: data.date,
        location: { address: data.locationAddress, city: data.locationCity },
        maxCapacity: data.maxCapacity,
        coachReservedSeats: data.coachReservedSeats,
        registrationOpenAt: new Date(data.registrationOpenAt).toISOString(),
        registrationCloseAt: new Date(data.registrationCloseAt).toISOString(),
        status: data.status,
        ...(selectedAteliers.length > 0 && { ateliers: selectedAteliers }),
      };
      return isNew
        ? api.post(`/admin/dojos/${dojoId}/events`, payload)
        : api.put(`/admin/events/${eventId}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adminEvents"] });
      navigate("/dashboard/admin/events");
    },
  });

  if (!isNew && isLoading) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        {isNew ? t("admin.event_create") : t("common.edit")}
      </Typography>
      {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t("common.error")}</Alert>}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <TextField label={t("admin.event_form.title")} fullWidth sx={{ mb: 2 }} {...register("title")} error={!!errors.title} required />
          <TextField label={t("admin.event_form.description")} fullWidth multiline rows={3} sx={{ mb: 2 }} {...register("description")} />
          <TextField label={t("admin.event_form.date")} type="date" fullWidth sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} {...register("date")} error={!!errors.date} required />

          {/* Location picker — pre-fills address fields from saved dojo locations */}
          {dojoLocations.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("admin.event_form.pick_location")}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {dojoLocations.map((loc) => (
                  <Button
                    key={loc.locationId}
                    variant="outlined"
                    size="small"
                    onClick={() => applyLocation(loc)}
                  >
                    {loc.name}
                  </Button>
                ))}
              </Box>
              <Divider sx={{ mt: 2, mb: 1 }} />
            </Box>
          )}

          <TextField label={t("admin.event_form.location_address")} fullWidth sx={{ mb: 2 }} {...register("locationAddress")} error={!!errors.locationAddress} required />
          <TextField label="City" fullWidth sx={{ mb: 2 }} {...register("locationCity")} error={!!errors.locationCity} required />
          <TextField label={t("admin.event_form.max_capacity")} type="number" fullWidth sx={{ mb: 2 }} {...register("maxCapacity")} error={!!errors.maxCapacity} required />
          <TextField
            label={t("admin.event_form.coach_reserved")}
            type="number"
            fullWidth
            sx={{ mb: 2 }}
            {...register("coachReservedSeats")}
            error={!!errors.coachReservedSeats}
            helperText={t("admin.event_form.coach_reserved_tip")}
          />
          <TextField label={t("admin.event_form.registration_open")} type="datetime-local" fullWidth sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} {...register("registrationOpenAt")} required />
          <TextField label={t("admin.event_form.registration_close")} type="datetime-local" fullWidth sx={{ mb: 2 }} slotProps={{ inputLabel: { shrink: true } }} {...register("registrationCloseAt")} required />
          {/* ── Tracks selectable per event, each with an optional seat limit ── */}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" sx={{ mb: 1 }}>{t("admin.tracks.event_tracks")}</Typography>
          {trackOptions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("admin.tracks.none_configured")}
            </Typography>
          ) : (
            <Box sx={{ mb: 3 }}>
              {trackOptions.map((tr) => {
                const sel = tracks[tr.atelierId];
                return (
                  <Box key={tr.atelierId} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <FormControlLabel
                      sx={{ flex: 1 }}
                      control={
                        <Checkbox
                          checked={!!sel?.selected}
                          onChange={(e) =>
                            setTracks((s) => ({
                              ...s,
                              [tr.atelierId]: { selected: e.target.checked, maxSeats: s[tr.atelierId]?.maxSeats ?? "" },
                            }))
                          }
                        />
                      }
                      label={tr.name}
                    />
                    <TextField
                      label={t("admin.tracks.max_seats")}
                      type="number"
                      size="small"
                      sx={{ width: 140 }}
                      disabled={!sel?.selected}
                      value={sel?.maxSeats ?? ""}
                      onChange={(e) =>
                        setTracks((s) => ({
                          ...s,
                          [tr.atelierId]: { selected: s[tr.atelierId]?.selected ?? false, maxSeats: e.target.value },
                        }))
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField select label={t("admin.event_form.status")} fullWidth sx={{ mb: 3 }} {...field}>
                {["draft", "published", "cancelled", "completed"].map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            )}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>{t("common.save")}</Button>
            <Button variant="outlined" onClick={() => navigate("/dashboard/admin/events")}>{t("common.cancel")}</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
