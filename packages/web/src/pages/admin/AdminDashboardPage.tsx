import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import { useAuth } from "../../hooks/useAuth";

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const memberships = user?.memberships ?? [];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>{t("admin.dashboard")}</Typography>
      <Typography color="text.secondary" mb={3}>
        {memberships.length === 0
          ? "You are not assigned to any dojo yet."
          : `Managing ${memberships.length} dojo(s)`}
      </Typography>

      <Grid container spacing={2}>
        {memberships.map((m) => (
          <Grid item xs={12} sm={6} md={4} key={m.dojoId}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="h6" fontWeight={600}>{m.dojoName}</Typography>
                  <Chip
                    label={m.role === "lead_coach" ? "Lead Coach" : "Coach"}
                    size="small"
                    color={m.role === "lead_coach" ? "primary" : "default"}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">{m.dojoCity}</Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  component={Link}
                  to={`/dashboard/admin/events?dojoId=${m.dojoId}`}
                >
                  {t("nav.events")}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
