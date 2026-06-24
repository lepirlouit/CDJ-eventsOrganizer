import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { api } from "../../lib/api";

type Gender = "boy" | "girl" | "other" | "prefer_not_to_say";

const GENDERS: Gender[] = ["boy", "girl", "other", "prefer_not_to_say"];

interface Child {
  childId: string;
  name: string;
  birthdate: string;
  gender?: Gender;
  previousVisits?: number;
}

export function MyChildrenPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Child | null>(null);
  const [open, setOpen] = useState(false);

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["myChildren"],
    queryFn: () => api.get("/users/me/children").then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (c: Child) =>
      c.childId
        ? api.put(`/users/me/children/${c.childId}`, c)
        : api.post("/users/me/children", c),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myChildren"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (childId: string) => api.delete(`/users/me/children/${childId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myChildren"] }),
  });

  function openNew() {
    setEditing({ childId: "", name: "", birthdate: "" });
    setOpen(true);
  }
  function openEdit(c: Child) {
    setEditing({ ...c });
    setOpen(true);
  }

  if (isLoading) return <LinearProgress />;

  return (
    <Box sx={{ maxWidth: 700, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{t("children.title")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          {t("children.add")}
        </Button>
      </Box>

      {children.length === 0 ? (
        <Typography color="text.secondary">{t("children.no_children")}</Typography>
      ) : (
        children.map((c) => (
          <Card key={c.childId} sx={{ mb: 2 }}>
            <CardContent>
              <Typography sx={{ fontWeight: 600 }}>{c.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(c.birthdate).toLocaleDateString()}
              </Typography>
            </CardContent>
            <CardActions>
              <IconButton size="small" onClick={() => openEdit(c)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  if (window.confirm(t("children.confirm_delete"))) deleteMutation.mutate(c.childId);
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardActions>
          </Card>
        ))
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editing?.childId ? t("children.edit") : t("children.add")}</DialogTitle>
        <DialogContent>
          <TextField
            label={t("children.name")}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            value={editing?.name ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, name: e.target.value } : p))}
          />
          <TextField
            label={t("children.birthdate")}
            type="date"
            fullWidth
            sx={{ mb: 2 }}
            slotProps={{ inputLabel: { shrink: true } }}
            value={editing?.birthdate ?? ""}
            onChange={(e) => setEditing((p) => (p ? { ...p, birthdate: e.target.value } : p))}
          />
          <TextField
            select
            label={t("children.gender")}
            fullWidth
            value={editing?.gender ?? ""}
            onChange={(e) =>
              setEditing((p) => (p ? { ...p, gender: (e.target.value || undefined) as Gender | undefined } : p))
            }
          >
            <MenuItem value="">{t("children.gender_unspecified")}</MenuItem>
            {GENDERS.map((g) => (
              <MenuItem key={g} value={g}>{t(`children.gender_${g}`)}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!editing?.name || !editing?.birthdate || saveMutation.isPending}
            onClick={() => editing && saveMutation.mutate(editing)}
          >
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
