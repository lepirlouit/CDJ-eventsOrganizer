import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const schema = z.object({
  ninjaName: z.string().min(1),
  ninjaBirthdate: z.string().min(1),
  parentName: z.string().min(1),
  parentEmail: z.string().email(),
  parentPhone: z.string().optional(),
  atelierId: z.string().min(1),
  needsComputer: z.boolean().default(false),
  previousVisits: z.coerce.number().min(0).default(0),
  heardAbout: z.string().optional(),
  consentPhotos: z.boolean().default(false),
  consentContact: z.boolean().default(false),
});
type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
  });

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { parentEmail: user?.email ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post(`/events/${eventId}/registrations`, data).then((r) => r.data),
  });

  if (isLoading) return <LinearProgress />;
  if (!event) return <Alert severity="error">Event not found</Alert>;

  function onSubmit(data: FormData) {
    mutation.mutate(data, {
      onSuccess: () => navigate("/dashboard/registrations"),
    });
  }

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={1}>
        {t("events.register")} — {event.title}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {new Date(event.date).toLocaleDateString()}
      </Typography>

      {mutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {mutation.data?.status === "waitlisted"
            ? t("registration.waitlisted", { position: mutation.data.position })
            : t("registration.success")}
        </Alert>
      )}
      {mutation.isError && <Alert severity="error" sx={{ mb: 2 }}>{t("common.error")}</Alert>}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Typography variant="h6" mb={2}>Ninja</Typography>
          <TextField
            label={t("registration.ninja_name")}
            fullWidth sx={{ mb: 2 }}
            {...register("ninjaName")}
            error={!!errors.ninjaName}
          />
          <TextField
            label={t("registration.birthdate")}
            type="date"
            fullWidth sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
            {...register("ninjaBirthdate")}
            error={!!errors.ninjaBirthdate}
          />
          <Controller
            name="atelierId"
            control={control}
            render={({ field }) => (
              <TextField select label={t("registration.atelier")} fullWidth sx={{ mb: 3 }} {...field} error={!!errors.atelierId}>
                {(event.ateliers ?? []).map((a: any) => (
                  <MenuItem key={a.atelierId} value={a.atelierId}>{a.name}</MenuItem>
                ))}
              </TextField>
            )}
          />

          <Typography variant="h6" mb={2}>Parent</Typography>
          <TextField label="Name" fullWidth sx={{ mb: 2 }} {...register("parentName")} error={!!errors.parentName} />
          <TextField label="Email" type="email" fullWidth sx={{ mb: 2 }} {...register("parentEmail")} error={!!errors.parentEmail} />
          <TextField label="Phone" fullWidth sx={{ mb: 2 }} {...register("parentPhone")} />
          <TextField
            label={t("registration.previous_visits")}
            type="number" fullWidth sx={{ mb: 2 }}
            {...register("previousVisits")}
          />
          <TextField label={t("registration.heard_about")} fullWidth sx={{ mb: 2 }} {...register("heardAbout")} />

          <Controller name="needsComputer" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} />} label={t("registration.needs_computer")} />
          )} />
          <Controller name="consentPhotos" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} />} label={t("registration.consent_photos")} />
          )} />
          <Controller name="consentContact" control={control} render={({ field }) => (
            <FormControlLabel control={<Checkbox {...field} checked={field.value} />} label={t("registration.consent_contact")} />
          )} />

          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={mutation.isPending}>
            {t("registration.submit")}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
