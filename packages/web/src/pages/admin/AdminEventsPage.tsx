import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";
import { useAuth, roleInDojo } from "../../hooks/useAuth";
import { EventStatusChip } from "../../components/admin/EventStatusChip";

interface Track {
  trackId?: string;
  name: string;
  active: boolean;
}

interface Question {
  questionId: string;
  label: string;
  type: "text" | "select" | "checkbox";
  options?: string[];
  required: boolean;
  active: boolean;
  order: number;
}

export function AdminEventsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  const memberships = user?.memberships ?? [];
  const dojoId = params.get("dojoId") ?? memberships[0]?.dojoId ?? "";
  const myRole = roleInDojo(user, dojoId);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["adminEvents", dojoId],
    queryFn: () => api.get(`/admin/dojos/${dojoId}/events`).then((r) => r.data),
    enabled: !!dojoId,
  });

  // ── Dojo track catalog management (lead coach) ──────────────────────────────
  const [tracksOpen, setTracksOpen] = useState(false);
  const [draftTracks, setDraftTracks] = useState<Track[]>([]);
  const { data: dojo } = useQuery({
    queryKey: ["dojo", dojoId],
    queryFn: () => api.get(`/dojos/${dojoId}`).then((r) => r.data),
    enabled: !!dojoId,
  });
  const saveTracksMutation = useMutation({
    mutationFn: (tracks: Track[]) => api.put(`/admin/dojos/${dojoId}/tracks`, { tracks }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojo", dojoId] }); setTracksOpen(false); },
  });
  function openTracks() {
    setDraftTracks((dojo?.tracks ?? []).map((tr: Track) => ({ ...tr })));
    setTracksOpen(true);
  }

  // ── Custom registration questions (lead coach) ──────────────────────────────
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{ label: string; type: Question["type"]; required: boolean; options: string }>(
    { label: "", type: "text", required: false, options: "" }
  );
  const { data: questions = [] } = useQuery<Question[]>({
    queryKey: ["dojoQuestions", dojoId],
    queryFn: () => api.get(`/dojos/${dojoId}/questions`).then((r) => r.data),
    enabled: !!dojoId && questionsOpen,
  });
  const invalidateQuestions = () => qc.invalidateQueries({ queryKey: ["dojoQuestions", dojoId] });
  const createQuestionMutation = useMutation({
    mutationFn: (q: { label: string; type: string; required: boolean; options?: string[]; order: number }) =>
      api.post(`/admin/dojos/${dojoId}/questions`, q),
    onSuccess: () => { invalidateQuestions(); setNewQuestion({ label: "", type: "text", required: false, options: "" }); },
  });
  const updateQuestionMutation = useMutation({
    mutationFn: ({ questionId, ...patch }: { questionId: string } & Partial<Question>) =>
      api.put(`/admin/dojos/${dojoId}/questions/${questionId}`, patch),
    onSuccess: invalidateQuestions,
  });
  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => api.delete(`/admin/dojos/${dojoId}/questions/${questionId}`),
    onSuccess: invalidateQuestions,
  });

  // ── Email participants / promote next event (lead coach) ────────────────────
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState<{ subject: string; message: string; audience: "all" | "last_event" }>(
    { subject: "", message: "", audience: "all" }
  );
  const broadcastMutation = useMutation({
    mutationFn: () => api.post(`/admin/dojos/${dojoId}/broadcast`, emailForm),
    onSuccess: () => { setEmailOpen(false); setEmailForm({ subject: "", message: "", audience: "all" }); },
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("nav.events")}</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {memberships.length > 1 && (
            <TextField
              select
              size="small"
              label="Dojo"
              value={dojoId}
              onChange={(e) => setParams({ dojoId: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              {memberships.map((m) => (
                <MenuItem key={m.dojoId} value={m.dojoId}>
                  {m.dojoName} ({m.role === "lead_coach" ? "Lead Coach" : "Coach"})
                </MenuItem>
              ))}
            </TextField>
          )}
          {myRole === "lead_coach" && (
            <>
              <Button variant="outlined" onClick={openTracks}>
                {t("admin.tracks.manage")}
              </Button>
              <Button variant="outlined" onClick={() => setQuestionsOpen(true)}>
                {t("admin.questions.manage")}
              </Button>
              <Button variant="outlined" onClick={() => setEmailOpen(true)}>
                {t("admin.email.title")}
              </Button>
              <Button variant="contained" component={Link} to={`/dashboard/admin/events/new/edit?dojoId=${dojoId}`}>
                {t("admin.event_create")}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Registrations</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map((ev: any) => (
              <TableRow key={ev.eventId}>
                <TableCell>{ev.title}</TableCell>
                <TableCell>{new Date(ev.date).toLocaleDateString()}</TableCell>
                <TableCell><EventStatusChip status={ev.status} /></TableCell>
                <TableCell>{ev.registrationCount} / {ev.maxCapacity - ev.coachReservedSeats}</TableCell>
                <TableCell>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/registrants`}>
                    {t("admin.registrants")}
                  </Button>
                  <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/checkin`}>
                    {t("admin.checkin.title")}
                  </Button>
                  {myRole === "lead_coach" && (
                    <>
                      <Button size="small" component={Link} to={`/dashboard/admin/events/${ev.eventId}/edit`}>
                        {t("common.edit")}
                      </Button>
                      <Button size="small" component={Link} to={`/dashboard/admin/events/new/edit?dojoId=${dojoId}&cloneFrom=${ev.eventId}`}>
                        {t("admin.event_clone")}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Dojo track catalog dialog ─────────────────────────────────────── */}
      <Dialog open={tracksOpen} onClose={() => setTracksOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin.tracks.manage")}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {t("admin.tracks.help")}
          </Typography>
          {draftTracks.map((tr, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <TextField
                label={t("admin.tracks.name")}
                size="small"
                fullWidth
                value={tr.name}
                onChange={(e) =>
                  setDraftTracks((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={tr.active}
                    onChange={(e) =>
                      setDraftTracks((s) => s.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))
                    }
                  />
                }
                label={<Typography variant="caption">{t("admin.tracks.active")}</Typography>}
              />
              <IconButton size="small" color="error" onClick={() => setDraftTracks((s) => s.filter((_, j) => j !== i))}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setDraftTracks((s) => [...s, { name: "", active: true }])}>
            {t("admin.tracks.add")}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTracksOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={saveTracksMutation.isPending || draftTracks.some((tr) => !tr.name.trim())}
            onClick={() => saveTracksMutation.mutate(draftTracks)}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Custom registration questions dialog ──────────────────────────── */}
      <Dialog open={questionsOpen} onClose={() => setQuestionsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin.questions.manage")}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {t("admin.questions.help")}
          </Typography>
          {questions.map((q) => (
            <Box key={q.questionId} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">{q.label}</Typography>
                <Typography variant="caption" color="text.secondary">{t(`admin.questions.type_${q.type}`)}{q.required ? " · *" : ""}</Typography>
              </Box>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={q.active}
                    onChange={(e) => updateQuestionMutation.mutate({ questionId: q.questionId, active: e.target.checked })}
                  />
                }
                label={<Typography variant="caption">{t("admin.tracks.active")}</Typography>}
              />
              <IconButton size="small" color="error" onClick={() => deleteQuestionMutation.mutate(q.questionId)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("admin.questions.add")}</Typography>
          <TextField
            label={t("admin.questions.label")} fullWidth size="small" sx={{ mb: 1.5 }}
            value={newQuestion.label}
            onChange={(e) => setNewQuestion((q) => ({ ...q, label: e.target.value }))}
          />
          <TextField
            select label={t("admin.questions.type")} fullWidth size="small" sx={{ mb: 1.5 }}
            value={newQuestion.type}
            onChange={(e) => setNewQuestion((q) => ({ ...q, type: e.target.value as Question["type"] }))}
          >
            {(["text", "select", "checkbox"] as const).map((ty) => (
              <MenuItem key={ty} value={ty}>{t(`admin.questions.type_${ty}`)}</MenuItem>
            ))}
          </TextField>
          {newQuestion.type === "select" && (
            <TextField
              label={t("admin.questions.options")} fullWidth size="small" sx={{ mb: 1.5 }}
              helperText={t("admin.questions.options_help")}
              value={newQuestion.options}
              onChange={(e) => setNewQuestion((q) => ({ ...q, options: e.target.value }))}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={newQuestion.required}
                onChange={(e) => setNewQuestion((q) => ({ ...q, required: e.target.checked }))}
              />
            }
            label={<Typography variant="caption">{t("admin.questions.required")}</Typography>}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionsOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!newQuestion.label.trim() || createQuestionMutation.isPending}
            onClick={() =>
              createQuestionMutation.mutate({
                label: newQuestion.label.trim(),
                type: newQuestion.type,
                required: newQuestion.required,
                order: questions.length,
                ...(newQuestion.type === "select" && {
                  options: newQuestion.options.split(",").map((o) => o.trim()).filter(Boolean),
                }),
              })
            }
          >
            {t("admin.questions.add")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Email participants dialog ─────────────────────────────────────── */}
      <Dialog open={emailOpen} onClose={() => setEmailOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin.email.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {t("admin.email.help")}
          </Typography>
          <TextField
            select label={t("admin.email.audience")} fullWidth size="small" sx={{ mb: 2 }}
            value={emailForm.audience}
            onChange={(e) => setEmailForm((f) => ({ ...f, audience: e.target.value as "all" | "last_event" }))}
          >
            <MenuItem value="all">{t("admin.email.audience_all")}</MenuItem>
            <MenuItem value="last_event">{t("admin.email.audience_last")}</MenuItem>
          </TextField>
          <TextField
            label={t("admin.email.subject")} fullWidth size="small" sx={{ mb: 2 }}
            value={emailForm.subject}
            onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <TextField
            label={t("admin.email.message")} fullWidth multiline rows={6}
            value={emailForm.message}
            onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
          />
          {broadcastMutation.isError && (
            <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>{t("common.error")}</Typography>
          )}
          {broadcastMutation.isSuccess && (
            <Typography color="success.main" variant="caption" sx={{ mt: 1, display: "block" }}>
              {t("admin.email.sent", { count: (broadcastMutation.data?.data?.sent ?? 0) as number })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!emailForm.subject.trim() || !emailForm.message.trim() || broadcastMutation.isPending}
            onClick={() => broadcastMutation.mutate()}
          >
            {t("admin.email.send")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
