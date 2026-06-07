import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";

const schema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});
type FormData = z.infer<typeof schema>;

export function SuperAdminDojosPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: dojos = [], isLoading } = useQuery({
    queryKey: ["dojos"],
    queryFn: () => api.get("/dojos").then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      editing
        ? api.put(`/admin/dojos/${editing.dojoId}`, data)
        : api.post("/admin/dojos", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dojos"] });
      setOpen(false);
      setEditing(null);
      reset();
    },
  });

  function openCreate() {
    setEditing(null);
    reset({ name: "", city: "", address: "", latitude: undefined, longitude: undefined });
    setOpen(true);
  }

  function openEdit(dojo: any) {
    setEditing(dojo);
    reset({
      name: dojo.name,
      city: dojo.city,
      address: dojo.address,
      latitude: dojo.latitude,
      longitude: dojo.longitude,
    });
    setOpen(true);
  }

  if (isLoading) return <LinearProgress />;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Dojos (Super Admin)</Typography>
        <Button variant="contained" onClick={openCreate}>Create Dojo</Button>
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Lat/Lng</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dojos.map((dojo: any) => (
              <TableRow key={dojo.dojoId}>
                <TableCell>{dojo.name}</TableCell>
                <TableCell>{dojo.city}</TableCell>
                <TableCell>{dojo.address}</TableCell>
                <TableCell>
                  {dojo.latitude && dojo.longitude
                    ? `${dojo.latitude.toFixed(4)}, ${dojo.longitude.toFixed(4)}`
                    : <Typography variant="body2" color="text.secondary">Not set</Typography>
                  }
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEdit(dojo)}>{t("common.edit")}</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <DialogTitle>{editing ? t("common.edit") : "Create Dojo"}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField label={t("admin.dojo_form.name")} fullWidth sx={{ mb: 2, mt: 1 }} {...register("name")} error={!!errors.name} required />
            <TextField label={t("admin.dojo_form.city")} fullWidth sx={{ mb: 2 }} {...register("city")} error={!!errors.city} required />
            <TextField label={t("admin.dojo_form.address")} fullWidth sx={{ mb: 2 }} {...register("address")} error={!!errors.address} required />
            <Box display="flex" gap={2} mb={1}>
              <TextField
                label={t("admin.dojo_form.latitude")}
                type="number"
                fullWidth
                {...register("latitude")}
                inputProps={{ step: "any" }}
              />
              <TextField
                label={t("admin.dojo_form.longitude")}
                type="number"
                fullWidth
                {...register("longitude")}
                inputProps={{ step: "any" }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {t("admin.dojo_form.coords_tip")}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" variant="contained" disabled={mutation.isPending}>{t("common.save")}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
