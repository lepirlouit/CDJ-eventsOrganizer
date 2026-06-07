import { useEffect } from "react";
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
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";
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

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
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
    }
  }, [event, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
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
    <Box maxWidth={700} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>
        {isNew ? t("admin.event_create") : t("common.edit")}
      </Typography>
      {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t("common.error")}</Alert>}
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <TextField label={t("admin.event_form.title")} fullWidth sx={{ mb: 2 }} {...register("title")} error={!!errors.title} required />
          <TextField label={t("admin.event_form.description")} fullWidth multiline rows={3} sx={{ mb: 2 }} {...register("description")} />
          <TextField label={t("admin.event_form.date")} type="date" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} {...register("date")} error={!!errors.date} required />
          <TextField label={t("admin.event_form.location_address")} fullWidth sx={{ mb: 2 }} {...register("locationAddress")} error={!!errors.locationAddress} required />
          <TextField label="City" fullWidth sx={{ mb: 2 }} {...register("locationCity")} error={!!errors.locationCity} required />
          <TextField label={t("admin.event_form.max_capacity")} type="number" fullWidth sx={{ mb: 2 }} {...register("maxCapacity")} error={!!errors.maxCapacity} required />
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <TextField
              label={t("admin.event_form.coach_reserved")}
              type="number"
              fullWidth
              {...register("coachReservedSeats")}
              error={!!errors.coachReservedSeats}
              helperText={t("admin.event_form.coach_reserved_tip")}
            />
            <Tooltip title={t("admin.event_form.coach_reserved_tip")}>
              <InfoIcon color="action" sx={{ mt: -2 }} />
            </Tooltip>
          </Box>
          <TextField label={t("admin.event_form.registration_open")} type="datetime-local" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} {...register("registrationOpenAt")} required />
          <TextField label={t("admin.event_form.registration_close")} type="datetime-local" fullWidth sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} {...register("registrationCloseAt")} required />
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
          <Box display="flex" gap={2}>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>{t("common.save")}</Button>
            <Button variant="outlined" onClick={() => navigate("/dashboard/admin/events")}>{t("common.cancel")}</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
