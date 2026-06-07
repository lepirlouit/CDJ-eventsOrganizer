import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import { api } from "../../lib/api";
import { RegistrationStatusChip } from "../../components/registrations/RegistrationStatusChip";

export function MyRegistrationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ["myRegistrations"],
    queryFn: () => api.get("/users/me/registrations").then((r) => r.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (registrationId: string) => api.delete(`/registrations/${registrationId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myRegistrations"] }),
  });

  if (isLoading) return <LinearProgress />;

  return (
    <Box maxWidth={700} mx="auto">
      <Typography variant="h5" fontWeight={700} mb={3}>My Registrations</Typography>
      {registrations.length === 0 ? (
        <Typography color="text.secondary">No registrations yet.</Typography>
      ) : (
        registrations.map((reg: any) => (
          <Card key={reg.registrationId} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <Typography fontWeight={600}>{reg.ninjaName}</Typography>
                <RegistrationStatusChip
                  status={reg.status}
                  isCoachChild={reg.isCoachChild}
                  checkedIn={reg.checkedIn}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Event: {reg.eventId} · Atelier: {reg.atelierId}
              </Typography>
            </CardContent>
            <CardActions>
              <Button
                size="small"
                color="error"
                onClick={() => cancelMutation.mutate(reg.registrationId)}
                disabled={cancelMutation.isPending}
              >
                {t("common.cancel")}
              </Button>
            </CardActions>
          </Card>
        ))
      )}
    </Box>
  );
}
