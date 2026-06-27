import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import DeleteIcon from "@mui/icons-material/Delete";
import PlaceIcon from "@mui/icons-material/Place";
import GroupIcon from "@mui/icons-material/Group";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../lib/api";
import { MapPicker } from "../../components/map/MapPicker";

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

const locationSchema = z.object({
  name:      z.string().min(1),
  address:   z.string().min(1),
  city:      z.string().min(1),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
  mapsUrl:   z.string().optional(),
});
type LocationForm = z.infer<typeof locationSchema>;
interface DojoLocation { locationId: string; name: string; address: string; city: string }
interface Dojo { dojoId: string; name: string; city: string; locations?: DojoLocation[] }
interface Member { userId: string; name?: string; email?: string; role: "coach" | "lead_coach"; canCheckIn?: boolean }

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const memberships = user?.memberships ?? [];

  // Location management dialog state
  const [locationDojo, setLocationDojo] = useState<{ dojoId: string; name: string } | null>(null);

  const { data: locationDojoDeta } = useQuery<Dojo>({
    queryKey: ["dojo", locationDojo?.dojoId],
    queryFn: () => api.get(`/dojos/${locationDojo!.dojoId}`).then((r) => r.data),
    enabled: !!locationDojo,
  });
  const locations = locationDojoDeta?.locations ?? [];

  const locForm = useForm<z.input<typeof locationSchema>, unknown, LocationForm>({ resolver: zodResolver(locationSchema) });
  const locAddress  = useWatch({ control: locForm.control, name: "address" });
  const locCity     = useWatch({ control: locForm.control, name: "city" });
  const locLat      = useWatch({ control: locForm.control, name: "latitude" });
  const locLng      = useWatch({ control: locForm.control, name: "longitude" });
  const [locLocating, setLocLocating] = useState(false);

  async function locateLocation() {
    const q = [locAddress, locCity].filter(Boolean).join(", ");
    if (!q) return;
    setLocLocating(true);
    const result = await geocode(q);
    if (result) { locForm.setValue("latitude", result.lat); locForm.setValue("longitude", result.lng); }
    setLocLocating(false);
  }

  const addLocMutation = useMutation({
    mutationFn: (data: LocationForm) => api.post(`/admin/dojos/${locationDojo!.dojoId}/locations`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dojo", locationDojo!.dojoId] }); locForm.reset(); },
  });
  const delLocMutation = useMutation({
    mutationFn: (locationId: string) => api.delete(`/admin/dojos/${locationDojo!.dojoId}/locations/${locationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dojo", locationDojo!.dojoId] }),
  });

  // ── Coach (member) management dialog state (lead coach) ──────────────────────
  const [memberDojo, setMemberDojo] = useState<{ dojoId: string; name: string } | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"coach" | "lead_coach">("coach");

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["dojoMembers", memberDojo?.dojoId],
    queryFn: () => api.get(`/admin/dojos/${memberDojo!.dojoId}/members`).then((r) => r.data),
    enabled: !!memberDojo,
  });
  const invalidateMembers = () => qc.invalidateQueries({ queryKey: ["dojoMembers", memberDojo?.dojoId] });
  const addMemberMutation = useMutation({
    mutationFn: () => api.post(`/admin/dojos/${memberDojo!.dojoId}/members/add`, { email: memberEmail.trim(), role: memberRole }),
    onSuccess: () => { invalidateMembers(); setMemberEmail(""); setMemberRole("coach"); },
  });
  const updateMemberMutation = useMutation({
    mutationFn: (v: { userId: string; role?: "coach" | "lead_coach"; canCheckIn?: boolean }) => {
      const { userId, ...patch } = v;
      return api.put(`/admin/dojos/${memberDojo!.dojoId}/members/${userId}/role`, patch);
    },
    onSuccess: invalidateMembers,
  });
  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/dojos/${memberDojo!.dojoId}/members/${userId}`),
    onSuccess: invalidateMembers,
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t("admin.dashboard")}</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {memberships.length === 0
          ? "You are not assigned to any dojo yet."
          : `Managing ${memberships.length} dojo(s)`}
      </Typography>

      <Grid container spacing={2}>
        {memberships.map((m) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={m.dojoId}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>{m.dojoName}</Typography>
                  <Chip
                    label={m.role === "lead_coach" ? "Lead Coach" : "Coach"}
                    size="small"
                    color={m.role === "lead_coach" ? "primary" : "default"}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">{m.dojoCity}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" component={Link} to={`/dashboard/admin/events?dojoId=${m.dojoId}`}>
                  {t("nav.events")}
                </Button>
                {m.role === "lead_coach" && (
                  <>
                    <Button
                      size="small"
                      startIcon={<PlaceIcon />}
                      onClick={() => { setLocationDojo({ dojoId: m.dojoId, name: m.dojoName }); locForm.reset(); }}
                    >
                      Locations
                    </Button>
                    <Button
                      size="small"
                      startIcon={<GroupIcon />}
                      onClick={() => { setMemberDojo({ dojoId: m.dojoId, name: m.dojoName }); setMemberEmail(""); setMemberRole("coach"); }}
                    >
                      {t("admin.members.manage")}
                    </Button>
                  </>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Location management dialog */}
      <Dialog open={!!locationDojo} onClose={() => setLocationDojo(null)} maxWidth="md" fullWidth>
        <DialogTitle>Locations — {locationDojo?.name}</DialogTitle>
        <DialogContent>
          {locations.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>No locations yet.</Typography>
          ) : (
            <Box sx={{ mb: 2 }}>
              {locations.map((loc) => (
                <Box key={loc.locationId} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{loc.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{loc.address}, {loc.city}</Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={() => delLocMutation.mutate(loc.locationId)} disabled={delLocMutation.isPending}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Add location</Typography>
          <form onSubmit={locForm.handleSubmit((d) => addLocMutation.mutate(d))} id="admin-loc-form">
            <TextField label="Location name" fullWidth sx={{ mb: 1.5 }} {...locForm.register("name")} error={!!locForm.formState.errors.name} required size="small" />
            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5 }}>
              <TextField label="Address" fullWidth {...locForm.register("address")} error={!!locForm.formState.errors.address} required size="small" />
              <TextField label="City" fullWidth {...locForm.register("city")} error={!!locForm.formState.errors.city} required size="small" />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Button size="small" variant="outlined" startIcon={locLocating ? <CircularProgress size={14} /> : <MyLocationIcon />} onClick={locateLocation} disabled={!locAddress || locLocating}>
                Locate on map
              </Button>
              <Typography variant="caption" color="text.secondary">or click / drag the pin</Typography>
            </Box>
            <MapPicker lat={locLat} lng={locLng} onChange={(lat, lng) => { locForm.setValue("latitude", lat); locForm.setValue("longitude", lng); }} />
            <TextField label="Maps URL (optional)" fullWidth sx={{ mt: 1.5 }} {...locForm.register("mapsUrl")} size="small" />
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDojo(null)}>{t("common.cancel")}</Button>
          <Button type="submit" form="admin-loc-form" variant="contained" disabled={addLocMutation.isPending}>Add location</Button>
        </DialogActions>
      </Dialog>

      {/* Coach (member) management dialog */}
      <Dialog open={!!memberDojo} onClose={() => setMemberDojo(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("admin.members.title")} — {memberDojo?.name}</DialogTitle>
        <DialogContent>
          {members.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>{t("admin.members.none")}</Typography>
          ) : (
            <Box sx={{ mb: 2 }}>
              {members.map((m) => {
                const isSelf = !!user && m.email?.toLowerCase() === user.email.toLowerCase();
                return (
                  <Box key={m.userId} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1, gap: 1, borderBottom: "1px solid", borderColor: "divider" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600 }} noWrap>{m.name ?? m.email}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{m.email}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                      <TextField
                        select
                        size="small"
                        value={m.role}
                        onChange={(e) => updateMemberMutation.mutate({ userId: m.userId, role: e.target.value as "coach" | "lead_coach" })}
                        disabled={isSelf || updateMemberMutation.isPending}
                        sx={{ minWidth: 130 }}
                      >
                        <MenuItem value="coach">{t("admin.members.coach")}</MenuItem>
                        <MenuItem value="lead_coach">{t("admin.members.lead_coach")}</MenuItem>
                      </TextField>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeMemberMutation.mutate(m.userId)}
                        disabled={isSelf || removeMemberMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("admin.members.add")}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {t("admin.members.add_help")}
          </Typography>
          <TextField label={t("admin.members.email")} fullWidth size="small" sx={{ mb: 1.5 }} value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} />
          <TextField select label={t("admin.members.role")} fullWidth size="small" value={memberRole} onChange={(e) => setMemberRole(e.target.value as "coach" | "lead_coach")}>
            <MenuItem value="coach">{t("admin.members.coach")}</MenuItem>
            <MenuItem value="lead_coach">{t("admin.members.lead_coach")}</MenuItem>
          </TextField>
          {addMemberMutation.isError && (
            <Typography color="error" variant="caption" sx={{ display: "block", mt: 1 }}>{t("admin.members.not_found")}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDojo(null)}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={!memberEmail.trim() || addMemberMutation.isPending} onClick={() => addMemberMutation.mutate()}>
            {t("admin.members.add")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
