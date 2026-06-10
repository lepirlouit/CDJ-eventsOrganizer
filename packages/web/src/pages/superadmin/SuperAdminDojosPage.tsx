import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaceIcon from "@mui/icons-material/Place";
import { api } from "../../lib/api";

// ── Dojo schema ───────────────────────────────────────────────────────────────
const dojoSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});
type DojoForm = z.infer<typeof dojoSchema>;

// ── Location schema ───────────────────────────────────────────────────────────
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

export function SuperAdminDojosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [dojoOpen, setDojoOpen] = useState(false);
  const [editingDojo, setEditingDojo] = useState<Dojo | null>(null);
  const [locDojo, setLocDojo] = useState<Dojo | null>(null);   // dojo whose locations are being managed
  const [memberDojo, setMemberDojo] = useState<Dojo | null>(null); // dojo whose members are being managed

  // ── Member management ─────────────────────────────────────────────────────
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("coach");
  const { data: dojoMembers = [] } = useQuery<{ userId: string; name: string; email: string; role: string }[]>({
    queryKey: ["dojoMembers", memberDojo?.dojoId],
    queryFn: () => api.get(`/admin/dojos/${memberDojo!.dojoId}/members`).then((r) => r.data),
    enabled: !!memberDojo,
  });
  const addMemberMutation = useMutation({
    mutationFn: () => api.post(`/admin/dojos/${memberDojo!.dojoId}/members/add`, { email: memberEmail, role: memberRole }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojoMembers", memberDojo?.dojoId] }); setMemberEmail(""); },
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
  const dojoMutation = useMutation({
    mutationFn: (data: DojoForm) =>
      editingDojo
        ? api.put(`/admin/dojos/${editingDojo.dojoId}`, data)
        : api.post("/admin/dojos", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojos"] }); setDojoOpen(false); setEditingDojo(null); dojoForm.reset(); },
  });

  function openCreateDojo() { setEditingDojo(null); dojoForm.reset({ name: "", city: "", address: "" }); setDojoOpen(true); }
  function openEditDojo(d: Dojo) { setEditingDojo(d); dojoForm.reset({ name: d.name, city: d.city, address: d.address, latitude: d.latitude, longitude: d.longitude }); setDojoOpen(true); }

  // ── Location form ──────────────────────────────────────────────────────────
  const locForm = useForm<LocationForm>({ resolver: zodResolver(locationSchema) });
  const addLocMutation = useMutation({
    mutationFn: (data: LocationForm) => api.post(`/admin/dojos/${locDojo?.dojoId}/locations`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojos"] }); locForm.reset(); },
  });
  const delLocMutation = useMutation({
    mutationFn: ({ dojoId, locationId }: { dojoId: string; locationId: string }) =>
      api.delete(`/admin/dojos/${dojoId}/locations/${locationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojos"] }),
  });

  // Refresh locDojo from the latest dojos list when locations change
  const currentLocDojo = locDojo ? dojos.find((d) => d.dojoId === locDojo.dojoId) ?? locDojo : null;

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Dojos (Super Admin)</Typography>
        <Button variant="contained" onClick={openCreateDojo}>Create Dojo</Button>
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
                  <Chip
                    label={`${dojo.locations?.length ?? 0} venue(s)`}
                    size="small"
                    icon={<PlaceIcon />}
                    onClick={() => setLocDojo(dojo)}
                    clickable
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEditDojo(dojo)}>{t("common.edit")}</Button>
                  <Button size="small" onClick={() => setLocDojo(dojo)}>Venues</Button>
                  <Button size="small" onClick={() => setMemberDojo(dojo)}>Coaches</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Dojo create/edit dialog ──────────────────────────────────────── */}
      <Dialog open={dojoOpen} onClose={() => setDojoOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={dojoForm.handleSubmit((d) => dojoMutation.mutate(d))}>
          <DialogTitle>{editingDojo ? t("common.edit") : "Create Dojo"}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField label={t("admin.dojo_form.name")} fullWidth sx={{ mb: 2, mt: 1 }} {...dojoForm.register("name")} error={!!dojoForm.formState.errors.name} required />
            <TextField label={t("admin.dojo_form.city")} fullWidth sx={{ mb: 2 }} {...dojoForm.register("city")} error={!!dojoForm.formState.errors.city} required />
            <TextField label={t("admin.dojo_form.address")} fullWidth sx={{ mb: 2 }} {...dojoForm.register("address")} error={!!dojoForm.formState.errors.address} required />
            <Box display="flex" gap={2}>
              <TextField label={t("admin.dojo_form.latitude")} type="number" fullWidth {...dojoForm.register("latitude")} inputProps={{ step: "any" }} />
              <TextField label={t("admin.dojo_form.longitude")} type="number" fullWidth {...dojoForm.register("longitude")} inputProps={{ step: "any" }} />
            </Box>
            <Typography variant="caption" color="text.secondary" mt={1} display="block">{t("admin.dojo_form.coords_tip")}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDojoOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={dojoMutation.isPending}>{t("common.save")}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── Locations management dialog ──────────────────────────────────── */}
      <Dialog open={!!currentLocDojo} onClose={() => { setLocDojo(null); locForm.reset(); }} maxWidth="sm" fullWidth>
        <DialogTitle>Venues — {currentLocDojo?.name}</DialogTitle>
        <DialogContent>
          {(currentLocDojo?.locations ?? []).length === 0 ? (
            <Typography color="text.secondary" mb={2}>No venues yet.</Typography>
          ) : (
            <Box mb={2}>
              {(currentLocDojo?.locations ?? []).map((loc) => (
                <Box key={loc.locationId} display="flex" alignItems="center" justifyContent="space-between" py={1} borderBottom="1px solid" borderColor="divider">
                  <Box>
                    <Typography fontWeight={600}>{loc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{loc.address}, {loc.city}</Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => delLocMutation.mutate({ dojoId: currentLocDojo!.dojoId, locationId: loc.locationId })}
                    disabled={delLocMutation.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" mb={1}>Add venue</Typography>
          <form onSubmit={locForm.handleSubmit((d) => addLocMutation.mutate(d))} id="loc-form">
            <TextField label="Venue name" fullWidth sx={{ mb: 1.5 }} {...locForm.register("name")} error={!!locForm.formState.errors.name} required size="small" placeholder="e.g. Bibliothèque principale" />
            <TextField label="Address" fullWidth sx={{ mb: 1.5 }} {...locForm.register("address")} error={!!locForm.formState.errors.address} required size="small" />
            <TextField label="City" fullWidth sx={{ mb: 1.5 }} {...locForm.register("city")} error={!!locForm.formState.errors.city} required size="small" />
            <Box display="flex" gap={1.5} mb={1.5}>
              <TextField label="Latitude" type="number" fullWidth {...locForm.register("latitude")} inputProps={{ step: "any" }} size="small" />
              <TextField label="Longitude" type="number" fullWidth {...locForm.register("longitude")} inputProps={{ step: "any" }} size="small" />
            </Box>
            <TextField label="Maps URL (optional)" fullWidth {...locForm.register("mapsUrl")} size="small" />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setLocDojo(null); locForm.reset(); }}>{t("common.cancel")}</Button>
          <Button type="submit" form="loc-form" variant="contained" disabled={addLocMutation.isPending}>Add venue</Button>
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
                  <IconButton size="small" color="error" onClick={() => removeMemberMutation.mutate(m.userId)} disabled={removeMemberMutation.isPending}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
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
    </Box>
  );
}
