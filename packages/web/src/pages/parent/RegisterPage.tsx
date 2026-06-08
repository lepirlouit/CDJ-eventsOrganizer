import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const childSchema = z.object({
  ninjaName:      z.string().min(1),
  ninjaBirthdate: z.string().min(1),
  atelierId:      z.string().min(1),
  needsComputer:  z.boolean().default(false),
  previousVisits: z.coerce.number().min(0).default(0),
});

const schema = z.object({
  parentName:     z.string().min(1),
  parentEmail:    z.string().email(),
  parentPhone:    z.string().optional(),
  heardAbout:     z.string().optional(),
  consentPhotos:  z.boolean().default(false),
  consentContact: z.boolean().default(false),
  children:       z.array(childSchema).min(1),
});

type FormData = z.infer<typeof schema>;

const emptyChild = (): z.infer<typeof childSchema> => ({
  ninjaName: "",
  ninjaBirthdate: "",
  atelierId: "",
  needsComputer: false,
  previousVisits: 0,
});

export function RegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => api.get(`/events/${eventId}`).then((r) => r.data),
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["myProfile"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
    enabled: !!user,
  });

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      parentEmail: user?.email ?? "",
      children: [emptyChild()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "children" });

  // Prefill from saved profile once it loads
  useEffect(() => {
    if (!profile) return;
    const savedKids = (profile.savedChildren ?? []) as { name: string; birthdate: string; previousVisits?: number }[];
    reset({
      parentName:     profile.parentName ?? "",
      parentEmail:    profile.email ?? user?.email ?? "",
      parentPhone:    profile.parentPhone ?? "",
      heardAbout:     profile.heardAbout ?? "",
      consentPhotos:  profile.consentPhotos ?? false,
      consentContact: profile.consentContact ?? false,
      children: savedKids.length > 0
        ? savedKids.map((c) => ({
            ninjaName:      c.name,
            ninjaBirthdate: c.birthdate,
            atelierId:      "",          // event-specific, not saved
            needsComputer:  false,
            previousVisits: c.previousVisits ?? 0,
          }))
        : [emptyChild()],
    });
  }, [profile, reset, user?.email]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Submit one registration per child
      const results = [];
      for (const child of data.children) {
        const result = await api.post(`/events/${eventId}/registrations`, {
          ninjaName:      child.ninjaName,
          ninjaBirthdate: child.ninjaBirthdate,
          atelierId:      child.atelierId,
          needsComputer:  child.needsComputer,
          previousVisits: child.previousVisits,
          parentName:     data.parentName,
          parentEmail:    data.parentEmail,
          parentPhone:    data.parentPhone,
          heardAbout:     data.heardAbout,
          consentPhotos:  data.consentPhotos,
          consentContact: data.consentContact,
        });
        results.push(result.data);
      }

      // Silently save profile for next time (fire-and-forget)
      api.put("/users/me", {
        parentName:     data.parentName,
        parentPhone:    data.parentPhone,
        heardAbout:     data.heardAbout,
        consentPhotos:  data.consentPhotos,
        consentContact: data.consentContact,
        savedChildren:  data.children.map((c) => ({
          name:           c.ninjaName,
          birthdate:      c.ninjaBirthdate,
          previousVisits: c.previousVisits,
        })),
      }).catch(() => {/* best-effort */});

      return results;
    },
    onSuccess: () => navigate("/dashboard/registrations"),
  });

  if (eventLoading || profileLoading) return <LinearProgress />;
  if (!event) return <Alert severity="error">Event not found</Alert>;

  const ateliers: { atelierId: string; name: string }[] = event.ateliers ?? [];

  return (
    <Box maxWidth={680} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={0.5}>
        {t("events.register")} — {event.title}
      </Typography>
      <Typography color="text.secondary" mb={3}>
        {new Date(event.date).toLocaleDateString()}
      </Typography>

      {mutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>{t("common.error")}</Alert>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>

        {/* ── Parent info ───────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" mb={2}>Parent</Typography>
          <TextField
            label="Name" fullWidth sx={{ mb: 2 }}
            {...register("parentName")}
            error={!!errors.parentName}
            helperText={errors.parentName && t("common.required")}
          />
          <TextField
            label="Email" type="email" fullWidth sx={{ mb: 2 }}
            {...register("parentEmail")}
            error={!!errors.parentEmail}
          />
          <TextField label="Phone" fullWidth sx={{ mb: 2 }} {...register("parentPhone")} />
          <TextField label={t("registration.heard_about")} fullWidth sx={{ mb: 2 }} {...register("heardAbout")} />

          <Controller name="consentPhotos" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label={t("registration.consent_photos")}
            />
          )} />
          <Controller name="consentContact" control={control} render={({ field }) => (
            <FormControlLabel
              control={<Checkbox {...field} checked={field.value} />}
              label={t("registration.consent_contact")}
            />
          )} />
        </Paper>

        {/* ── Children ──────────────────────────────────────── */}
        {fields.map((field, idx) => (
          <Paper key={field.id} sx={{ p: 3, mb: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">
                  {t("registration.ninja_name")} {fields.length > 1 ? `#${idx + 1}` : ""}
                </Typography>
                {idx === 0 && <Chip label="Child" size="small" color="primary" variant="outlined" />}
              </Box>
              {fields.length > 1 && (
                <IconButton size="small" color="error" onClick={() => remove(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            <TextField
              label={t("registration.ninja_name")} fullWidth sx={{ mb: 2 }}
              {...register(`children.${idx}.ninjaName`)}
              error={!!errors.children?.[idx]?.ninjaName}
              helperText={errors.children?.[idx]?.ninjaName && t("common.required")}
            />
            <TextField
              label={t("registration.birthdate")} type="date" fullWidth sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
              {...register(`children.${idx}.ninjaBirthdate`)}
              error={!!errors.children?.[idx]?.ninjaBirthdate}
            />
            <Controller
              name={`children.${idx}.atelierId`}
              control={control}
              render={({ field: f }) => (
                <TextField
                  select label={t("registration.atelier")} fullWidth sx={{ mb: 2 }}
                  {...f}
                  error={!!errors.children?.[idx]?.atelierId}
                >
                  {ateliers.map((a) => (
                    <MenuItem key={a.atelierId} value={a.atelierId}>{a.name}</MenuItem>
                  ))}
                </TextField>
              )}
            />
            <TextField
              label={t("registration.previous_visits")} type="number"
              fullWidth sx={{ mb: 2 }}
              {...register(`children.${idx}.previousVisits`)}
              inputProps={{ min: 0 }}
            />
            <Controller name={`children.${idx}.needsComputer`} control={control} render={({ field: f }) => (
              <FormControlLabel
                control={<Checkbox {...f} checked={f.value} />}
                label={t("registration.needs_computer")}
              />
            )} />
          </Paper>
        ))}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append(emptyChild())}
          sx={{ mb: 3 }}
        >
          {t("registration.add_child")}
        </Button>

        <Divider sx={{ mb: 3 }} />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? `${t("registration.submit")}…`
            : t("registration.submit")}
        </Button>
      </form>
    </Box>
  );
}
