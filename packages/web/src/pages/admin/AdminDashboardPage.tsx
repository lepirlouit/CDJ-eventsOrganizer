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
import { useAuth } from "../../hooks/useAuth";

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>{t("admin.dashboard")}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Events</Typography>
              <Typography variant="body2" color="text.secondary">Manage events for your dojo</Typography>
            </CardContent>
            <CardActions>
              <Button component={Link} to="/dashboard/admin/events">{t("nav.events")}</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
