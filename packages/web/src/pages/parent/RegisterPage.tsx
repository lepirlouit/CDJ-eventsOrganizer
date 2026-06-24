import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import { api } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

const parentSchema = z.object({
  parentName:     z.string().min(1),
  parentEmail:    z.email(),
  parentPhone:    z.string().optional(),
  heardAbout:     z.string().optional(),
  consentPhotos:  z.boolean().default(false),
  consentContact: z.boolean().default(false),
});
type ParentForm = z.infer<typeof parentSchema>;

type Gender = "boy" | "girl" | "other" | "prefer_not_to_say";
const GENDERS: Gender[] = ["boy", "girl", "other", "prefer_not_to_say"];

interface Child {
  childId: string;
  name: string;
  birthdate: string;
  gender?: Gender;
  previousVisits?: number;
}

interface CustomQuestion {
  questionId: string;
  label: string;
  type: "text" | "select" | "checkbox";
  options?: string[];
  required: boolean;
  active: boolean;
  order: number;
}

interface Selection {
  atelierId: string;
  needsComputer: boolean;
  answers: Record<string, unknown>;
}

export function RegisterPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["myChildren"],
    queryFn: () => api.get("/users/me/children").then((r) => r.data),
    enabled: !!user,
  });

  const { data: questions = [] } = useQuery<CustomQuestion[]>({
    queryKey: ["dojoQuestions", event?.dojoId],
    queryFn: () => api.get(`/dojos/${event.dojoId}/questions`).then((r) => r.data),
    enabled: !!event?.dojoId,
  });
  const activeQuestions = questions.filter((q) => q.active).sort((a, b) => a.order - b.order);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<z.input<typeof parentSchema>, unknown, ParentForm>({
    resolver: zodResolver(parentSchema),
    defaultValues: { parentEmail: user?.email ?? "", consentPhotos: false, consentContact: false },
  });

  // Per-child registration choices, keyed by childId. Presence = selected.
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [childError, setChildError] = useState<string | null>(null);

  // "Add a new child" dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBirthdate, setNewBirthdate] = useState("");
  const [newGender, setNewGender] = useState<Gender | "">("");

  // Prefill parent fields from the saved profile once it loads.
  useEffect(() => {
    if (!profile) return;
    reset({
      parentName:     profile.parentName ?? "",
      parentEmail:    profile.email ?? user?.email ?? "",
      parentPhone:    profile.parentPhone ?? "",
      heardAbout:     profile.heardAbout ?? "",
      consentPhotos:  profile.consentPhotos ?? false,
      consentContact: profile.consentContact ?? false,
    });
  }, [profile, reset, user?.email]);

  const addChildMutation = useMutation({
    mutationFn: (c: { name: string; birthdate: string; gender?: Gender }) =>
      api.post("/users/me/children", c).then((r) => r.data as Child),
    onSuccess: (child) => {
      qc.invalidateQueries({ queryKey: ["myChildren"] });
      setSelected((s) => ({ ...s, [child.childId]: { atelierId: "", needsComputer: false, answers: {} } }));
      setDialogOpen(false);
      setNewName("");
      setNewBirthdate("");
      setNewGender("");
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (parent: ParentForm) => {
      // One registration per selected child — each carries its stable childId.
      for (const [childId, sel] of Object.entries(selected)) {
        await api.post(`/events/${eventId}/registrations`, {
          childId,
          atelierId:      sel.atelierId,
          needsComputer:  sel.needsComputer,
          parentName:     parent.parentName,
          parentEmail:    parent.parentEmail,
          parentPhone:    parent.parentPhone,
          heardAbout:     parent.heardAbout,
          consentPhotos:  parent.consentPhotos,
          consentContact: parent.consentContact,
          customAnswers:  sel.answers,
        });
      }
      // Persist parent profile for next time (best-effort; children live in their own entity now).
      api.put("/users/me", {
        parentName:     parent.parentName,
        parentPhone:    parent.parentPhone,
        heardAbout:     parent.heardAbout,
        consentPhotos:  parent.consentPhotos,
        consentContact: parent.consentContact,
      }).catch(() => {/* best-effort */});
    },
    onSuccess: () => navigate("/dashboard/registrations"),
  });

  function toggleChild(childId: string) {
    setSelected((s) => {
      const next = { ...s };
      if (next[childId]) delete next[childId];
      else next[childId] = { atelierId: "", needsComputer: false, answers: {} };
      return next;
    });
  }

  function onSubmit(parent: ParentForm) {
    const entries = Object.entries(selected);
    if (entries.length === 0) { setChildError(t("children.select_prompt")); return; }
    if (entries.some(([, sel]) => !sel.atelierId)) { setChildError(t("common.required")); return; }
    // A child's name must differ from the parent's (mirrors the backend rule).
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const parentNorm = norm(parent.parentName);
    const clash = entries.some(([childId]) =>
      norm(children.find((c) => c.childId === childId)?.name ?? "") === parentNorm
    );
    if (clash) { setChildError(t("registration.child_name_equals_parent")); return; }
    // Required custom questions must be answered for every selected child.
    const requiredQs = activeQuestions.filter((q) => q.required);
    const answersMissing = entries.some(([, sel]) =>
      requiredQs.some((q) => {
        const a = sel.answers[q.questionId];
        return a === undefined || a === null || a === "" || (q.type === "checkbox" && a !== true);
      })
    );
    if (answersMissing) { setChildError(t("common.required")); return; }
    setChildError(null);
    submitMutation.mutate(parent);
  }

  if (eventLoading || profileLoading || childrenLoading) return <LinearProgress />;
  if (!event) return <Alert severity="error">Event not found</Alert>;

  const ateliers: { atelierId: string; name: string; maxSeats?: number }[] = event.ateliers ?? [];
  const atelierCounts: Record<string, number> = event.atelierCounts ?? {};
  const atelierFull = (a: { atelierId: string; maxSeats?: number }) =>
    a.maxSeats !== undefined && a.maxSeats !== null && (atelierCounts[a.atelierId] ?? 0) >= a.maxSeats;

  return (
    <Box sx={{ maxWidth: 680, mx: "auto" }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
        {t("events.register")} — {event.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {new Date(event.date).toLocaleDateString()}
      </Typography>

      {submitMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>{t("common.error")}</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ── Parent info ───────────────────────────────────── */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Parent</Typography>
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

        {/* ── Children picker ───────────────────────────────── */}
        <Typography variant="h6" sx={{ mb: 1 }}>{t("children.title")}</Typography>
        {childError && <Alert severity="warning" sx={{ mb: 2 }}>{childError}</Alert>}
        {children.length === 0 && (
          <Typography color="text.secondary" sx={{ mb: 2 }}>{t("children.select_prompt")}</Typography>
        )}

        {children.map((c) => {
          const sel = selected[c.childId];
          return (
            <Paper key={c.childId} sx={{ p: 2, mb: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={!!sel} onChange={() => toggleChild(c.childId)} />}
                label={
                  <span>
                    <b>{c.name}</b> · {new Date(c.birthdate).toLocaleDateString()}
                  </span>
                }
              />
              {sel && (
                <Box sx={{ pl: 4, pt: 1 }}>
                  <TextField
                    select label={t("registration.atelier")} fullWidth sx={{ mb: 2 }}
                    value={sel.atelierId}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [c.childId]: { ...s[c.childId], atelierId: e.target.value } }))
                    }
                    error={!!childError && !sel.atelierId}
                  >
                    {ateliers.map((a) => (
                      <MenuItem key={a.atelierId} value={a.atelierId} disabled={atelierFull(a)}>
                        {a.name}{atelierFull(a) ? ` — ${t("events.full")}` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sel.needsComputer}
                        onChange={(e) =>
                          setSelected((s) => ({ ...s, [c.childId]: { ...s[c.childId], needsComputer: e.target.checked } }))
                        }
                      />
                    }
                    label={t("registration.needs_computer")}
                  />

                  {/* ── Dojo custom questions ───────────────────────── */}
                  {activeQuestions.map((q) => {
                    const setAnswer = (value: unknown) =>
                      setSelected((s) => ({
                        ...s,
                        [c.childId]: { ...s[c.childId], answers: { ...s[c.childId].answers, [q.questionId]: value } },
                      }));
                    if (q.type === "checkbox") {
                      return (
                        <FormControlLabel
                          key={q.questionId}
                          control={
                            <Checkbox
                              checked={sel.answers[q.questionId] === true}
                              onChange={(e) => setAnswer(e.target.checked)}
                            />
                          }
                          label={q.label + (q.required ? " *" : "")}
                        />
                      );
                    }
                    if (q.type === "select") {
                      return (
                        <TextField
                          key={q.questionId}
                          select fullWidth sx={{ mt: 2 }}
                          label={q.label + (q.required ? " *" : "")}
                          value={(sel.answers[q.questionId] as string) ?? ""}
                          onChange={(e) => setAnswer(e.target.value)}
                        >
                          {(q.options ?? []).map((opt) => (
                            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                          ))}
                        </TextField>
                      );
                    }
                    return (
                      <TextField
                        key={q.questionId}
                        fullWidth sx={{ mt: 2 }}
                        label={q.label + (q.required ? " *" : "")}
                        value={(sel.answers[q.questionId] as string) ?? ""}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    );
                  })}
                </Box>
              )}
            </Paper>
          );
        })}

        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ mb: 3 }}
        >
          {t("children.add_new")}
        </Button>

        <Divider sx={{ mb: 3 }} />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={submitMutation.isPending}
        >
          {submitMutation.isPending
            ? `${t("registration.submit")}…`
            : t("registration.submit")}
        </Button>
      </form>

      {/* ── Add-a-new-child dialog ────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("children.add")}</DialogTitle>
        <DialogContent>
          <TextField
            label={t("children.name")} fullWidth sx={{ mt: 1, mb: 2 }}
            value={newName} onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            label={t("children.birthdate")} type="date" fullWidth sx={{ mb: 2 }}
            slotProps={{ inputLabel: { shrink: true } }}
            value={newBirthdate} onChange={(e) => setNewBirthdate(e.target.value)}
          />
          <TextField
            select label={t("children.gender")} fullWidth
            value={newGender}
            onChange={(e) => setNewGender(e.target.value as Gender | "")}
          >
            <MenuItem value="">{t("children.gender_unspecified")}</MenuItem>
            {GENDERS.map((g) => (
              <MenuItem key={g} value={g}>{t(`children.gender_${g}`)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!newName || !newBirthdate || addChildMutation.isPending}
            onClick={() => addChildMutation.mutate({ name: newName, birthdate: newBirthdate, gender: newGender || undefined })}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
