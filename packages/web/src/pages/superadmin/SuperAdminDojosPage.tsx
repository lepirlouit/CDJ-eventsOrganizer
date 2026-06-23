import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaceIcon from "@mui/icons-material/Place";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { api } from "../../lib/api";
import { MapPicker } from "../../components/map/MapPicker";

// ── Schemas ───────────────────────────────────────────────────────────────────
const dojoSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});
type DojoForm = z.infer<typeof dojoSchema>;

const locationSchema = z.object({
  name:      z.string().min(1),
  address:   z.string().min(1),
  city:      z.string().min(1),
  latitude:  z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  mapsUrl:   z.string().optional(),
});
type LocationForm = z.infer<typeof locationSchema>;

interface DojoLocation { locationId: string; name: string; address: string; city: string }
interface Dojo { dojoId: string; name: string; city: string; address: string; latitude?: number; longitude?: number; locations?: DojoLocation[] }

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { "User-Agent": "CoderDojo Belgium Events App" } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* ignore */ }
  return null;
}

export function SuperAdminDojosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dojoOpen, setDojoOpen] = useState(false);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [locDojo, setLocDojo] = useState<Dojo | null>(null);
  const [memberDojo, setMemberDojo] = useState<Dojo | null>(null);
  const [dojoLocating, setDojoLocating] = useState(false);
  const [locLocating, setLocLocating] = useState(false);

  // ── Newsletter to all coaches ───────────────────────────────────────────────
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [newsletter, setNewsletter] = useState({ subject: "", message: "" });
  const newsletterMutation = useMutation({
    mutationFn: () => api.post("/admin/newsletter", newsletter),
    onSuccess: () => { setNewsletterOpen(false); setNewsletter({ subject: "", message: "" }); },
  });

  // ── Member management ─────────────────────────────────────────────────────
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("coach");
  const { data: dojoMembers = [] } = useQuery<{ userId: string; name: string; email: string; role: string; canCheckIn?: boolean }[]>({
    queryKey: ["dojoMembers", memberDojo?.dojoId],
    queryFn: () => api.get(`/admin/dojos/${memberDojo!.dojoId}/members`).then((r) => r.data),
    enabled: !!memberDojo,
  });
  const addMemberMutation = useMutation({
    mutationFn: () => api.post(`/admin/dojos/${memberDojo!.dojoId}/members/add`, { email: memberEmail, role: memberRole }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojoMembers", memberDojo?.dojoId] }); setMemberEmail(""); },
  });
  const updateMemberMutation = useMutation({
    mutationFn: (v: { userId: string; canCheckIn: boolean }) =>
      api.put(`/admin/dojos/${memberDojo!.dojoId}/members/${v.userId}/role`, { canCheckIn: v.canCheckIn }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojoMembers", memberDojo?.dojoId] }),
  });
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/dojos/${memberDojo!.dojoId}/members/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojoMembers", memberDojo?.dojoId] }),
  });

  const { data: dojos = [], isLoading } = useQuery<Dojo[]>({
    queryKey: ["dojos"],
    queryFn: () => api.get("/dojos").then((r) => r.data),
  });

  // ── Dojo form ──────────────────────────────────────────────────────────────
  const dojoForm = useForm<DojoForm>({ resolver: zodResolver(dojoSchema) });
  const dojoAddress = useWatch({ control: dojoForm.control, name: "address" });
  const dojoCity    = useWatch({ control: dojoForm.control, name: "city" });
  const dojoLat     = useWatch({ control: dojoForm.control, name: "latitude" });
  const dojoLng     = useWatch({ control: dojoForm.control, name: "longitude" });

  const dojoMutation = useMutation({
    mutationFn: (data: DojoForm) =>
      editingDojo ? api.put(`/admin/dojos/${editingDojo.dojoId}`, data) : api.post("/admin/dojos", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojos"] }); setDojoOpen(false); setEditingDojo(null); dojoForm.reset(); },
  });

  function openCreateDojo() { setEditingDojo(null); dojoForm.reset({ name: "", city: "", address: "" }); setDojoOpen(true); }
  function openEditDojo(d: Dojo) { setEditingDojo(d); dojoForm.reset({ name: d.name, city: d.city, address: d.address, latitude: d.latitude, longitude: d.longitude }); setDojoOpen(true); }

  async function locateDojo() {
    const q = [dojoAddress, dojoCity].filter(Boolean).join(", ");
    if (!q) return;
    setDojoLocating(true);
    const result = await geocode(q);
    if (result) { dojoForm.setValue("latitude", result.lat); dojoForm.setValue("longitude", result.lng); }
    setDojoLocating(false);
  }

  // ── Location form ──────────────────────────────────────────────────────────
  const locForm = useForm<LocationForm>({ resolver: zodResolver(locationSchema) });
  const locAddress = useWatch({ control: locForm.control, name: "address" });
  const locCity    = useWatch({ control: locForm.control, name: "city" });
  const locLat     = useWatch({ control: locForm.control, name: "latitude" });
  const locLng     = useWatch({ control: locForm.control, name: "longitude" });

  const addLocMutation = useMutation({
    mutationFn: (data: LocationForm) => api.post(`/admin/dojos/${locDojo?.dojoId}/locations`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojos"] }); locForm.reset(); },
  });
  const delLocMutation = useMutation({
    mutationFn: ({ dojoId, locationId }: { dojoId: string; locationId: string }) =>
      api.delete(`/admin/dojos/${dojoId}/locations/${locationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojos"] }),
  });

  async function locateLocation() {
    const q = [locAddress, locCity].filter(Boolean).join(", ");
    if (!q) return;
    setLocLocating(true);
    const result = await geocode(q);
    if (result) { locForm.setValue("latitude", result.lat); locForm.setValue("longitude", result.lng); }
    setLocLocating(false);
  }

  const currentLocDojo = locDojo ? dojos.find((d) => d.dojoId === locDojo.dojoId) ?? locDojo : null;

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Dojos (Super Admin)</Typography>
        <Box display="flex" gap={1}>
          <Button component={RouterLink} to="/dashboard/superadmin/stats" variant="outlined">{t("stats.title")}</Button>
          <Button variant="outlined" onClick={() => setNewsletterOpen(true)}>{t("admin.newsletter.title")}</Button>
          <Button variant="contained" onClick={openCreateDojo}>Create Dojo</Button>
        </Box>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Lat/Lng</TableCell>
              <TableCell>Locations</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dojos.map((dojo) => (
              <TableRow key={dojo.dojoId}>
                <TableCell>{dojo.name}</TableCell>
                <TableCell>{dojo.city}</TableCell>
                <TableCell>
                  {dojo.latitude && dojo.longitude
                    ? `${dojo.latitude.toFixed(4)}, ${dojo.longitude.toFixed(4)}`
                    : <Typography variant="body2" color="text.secondary">Not set</Typography>}
                </TableCell>
                <TableCell>
                  <Chip label={`${dojo.locations?.length ?? 0} location(s)`} size="small" icon={<PlaceIcon />} onClick={() => setLocDojo(dojo)} clickable />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEditDojo(dojo)}>{t("common.edit")}</Button>
                  <Button size="small" onClick={() => setLocDojo(dojo)}>Locations</Button>
                  <Button size="small" onClick={() => setMemberDojo(dojo)}>Coaches</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Dojo create/edit dialog ──────────────────────────────────────── */}
      <Dialog open={dojoOpen} onClose={() => setDojoOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={dojoForm.handleSubmit((d) => dojoMutation.mutate(d))}>
          <DialogTitle>{editingDojo ? t("common.edit") : "Create Dojo"}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField label={t("admin.dojo_form.name")} fullWidth sx={{ mb: 2, mt: 1 }} {...dojoForm.register("name")} error={!!dojoForm.formState.errors.name} required />
            <Box display="flex" gap={2} mb={2}>
              <TextField label={t("admin.dojo_form.city")} fullWidth {...dojoForm.register("city")} error={!!dojoForm.formState.errors.city} required />
              <TextField label={t("admin.dojo_form.address")} fullWidth {...dojoForm.register("address")} error={!!dojoForm.formState.errors.address} required />
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={dojoLocating ? <CircularProgress size={14} /> : <MyLocationIcon />}
                onClick={locateDojo}
                disabled={!dojoAddress || dojoLocating}
              >
                Locate on map
              </Button>
              <Typography variant="caption" color="text.secondary">
                or click / drag the pin directly
              </Typography>
            </Box>
            <MapPicker
              lat={dojoLat}
              lng={dojoLng}
              onChange={(lat, lng) => { dojoForm.setValue("latitude", lat); dojoForm.setValue("longitude", lng); }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDojoOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={dojoMutation.isPending}>{t("common.save")}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Locations management dialog ──────────────────────────────────── */}
      <Dialog open={!!currentLocDojo} onClose={() => { setLocDojo(null); locForm.reset(); }} maxWidth="md" fullWidth>
        <DialogTitle>Locations — {currentLocDojo?.name}</DialogTitle>
        <DialogContent>
          {(currentLocDojo?.locations ?? []).length === 0 ? (
            <Typography color="text.secondary" mb={2}>No locations yet.</Typography>
          ) : (
            <Box mb={2}>
              {(currentLocDojo?.locations ?? []).map((loc) => (
                <Box key={loc.locationId} display="flex" alignItems="center" justifyContent="space-between" py={1} borderBottom="1px solid" borderColor="divider">
                  <Box>
                    <Typography fontWeight={600}>{loc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{loc.address}, {loc.city}</Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => delLocMutation.mutate({ dojoId: currentLocDojo!.dojoId, locationId: loc.locationId })} disabled={delLocMutation.isPending}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" mb={1}>Add location</Typography>
          <form onSubmit={locForm.handleSubmit((d) => addLocMutation.mutate(d))} id="loc-form">
            <TextField label="Location name" fullWidth sx={{ mb: 1.5 }} {...locForm.register("name")} error={!!locForm.formState.errors.name} required size="small" placeholder="e.g. Bibliothèque principale" />
            <Box display="flex" gap={1.5} mb={1.5}>
              <TextField label="Address" fullWidth {...locForm.register("address")} error={!!locForm.formState.errors.address} required size="small" />
              <TextField label="City" fullWidth {...locForm.register("city")} error={!!locForm.formState.errors.city} required size="small" />
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={locLocating ? <CircularProgress size={14} /> : <MyLocationIcon />}
                onClick={locateLocation}
                disabled={!locAddress || locLocating}
              >
                Locate on map
              </Button>
              <Typography variant="caption" color="text.secondary">or click / drag the pin</Typography>
            </Box>
            <MapPicker
              lat={locLat}
              lng={locLng}
              onChange={(lat, lng) => { locForm.setValue("latitude", lat); locForm.setValue("longitude", lng); }}
            />
            <TextField label="Maps URL (optional)" fullWidth sx={{ mt: 1.5 }} {...locForm.register("mapsUrl")} size="small" />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLocDojo(null); locForm.reset(); }}>{t("common.cancel")}</Button>
          <Button type="submit" form="loc-form" variant="contained" disabled={addLocMutation.isPending}>Add location</Button>
        </DialogActions>
      </Dialog>

      {/* ── Coach members dialog ─────────────────────────────────────────── */}
      <Dialog open={!!memberDojo} onClose={() => setMemberDojo(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Coaches — {memberDojo?.name}</DialogTitle>
        <DialogContent>
          {dojoMembers.length === 0 ? (
            <Typography color="text.secondary" mb={2}>No coaches yet.</Typography>
          ) : (
            <Box mb={2}>
              {dojoMembers.map((m) => (
                <Box key={m.userId} display="flex" alignItems="center" justifyContent="space-between" py={1} borderBottom="1px solid" borderColor="divider">
                  <Box>
                    <Typography fontWeight={600}>{m.name} <Chip label={m.role} size="small" color={m.role === "lead_coach" ? "primary" : "default"} sx={{ ml: 0.5 }} /></Typography>
                    <Typography variant="body2" color="text.secondary">{m.email}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    {m.role === "coach" && (
                      <FormControlLabel
                        sx={{ mr: 0 }}
                        control={
                          <Switch
                            size="small"
                            checked={m.canCheckIn !== false}
                            onChange={(e) => updateMemberMutation.mutate({ userId: m.userId, canCheckIn: e.target.checked })}
                            disabled={updateMemberMutation.isPending}
                          />
                        }
                        label={<Typography variant="caption">{t("admin.members.can_checkin")}</Typography>}
                      />
                    )}
                    <IconButton size="small" color="error" onClick={() => removeMemberMutation.mutate(m.userId)} disabled={removeMemberMutation.isPending}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" mb={1}>Add coach</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            The person must have logged in at least once before you can add them.
          </Typography>
          <TextField label="Email address" fullWidth size="small" sx={{ mb: 1.5 }} value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
          <TextField select label="Role" fullWidth size="small" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
            <MenuItem value="coach">Coach</MenuItem>
            <MenuItem value="lead_coach">Lead Coach</MenuItem>
          </TextField>
          {addMemberMutation.isError && <Typography color="error" variant="caption" mt={1} display="block">User not found — ask them to log in first.</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDojo(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={!memberEmail || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate()}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Newsletter to all coaches ─────────────────────────────────────── */}
      <Dialog open={newsletterOpen} onClose={() => setNewsletterOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("admin.newsletter.title")}</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            {t("admin.newsletter.help")}
          </Typography>
          <TextField
            label={t("admin.email.subject")} fullWidth size="small" sx={{ mb: 2 }}
            value={newsletter.subject}
            onChange={(e) => setNewsletter((n) => ({ ...n, subject: e.target.value }))}
          />
          <TextField
            label={t("admin.email.message")} fullWidth multiline rows={6}
            value={newsletter.message}
            onChange={(e) => setNewsletter((n) => ({ ...n, message: e.target.value }))}
          />
          {newsletterMutation.isSuccess && (
            <Typography color="success.main" variant="caption" mt={1} display="block">
              {t("admin.email.sent", { count: (newsletterMutation.data?.data?.sent ?? 0) as number })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewsletterOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!newsletter.subject.trim() || !newsletter.message.trim() || newsletterMutation.isPending}
            onClick={() => newsletterMutation.mutate()}
          >
            {t("admin.email.send")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
