import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { answerChallenge } from "../../lib/auth";
import { useAuth } from "../../hooks/useAuth";

export function VerifyOtpPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state?.user) { navigate("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const { accessToken, idToken } = await answerChallenge(state.user, otp.trim());
      login(accessToken, idToken);
      navigate("/");
    } catch {
      setError(t("auth.invalid_code"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box display="flex" justifyContent="center" pt={8}>
      <Card sx={{ width: "100%", maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
            {t("auth.check_email")}
          </Typography>
          <Typography color="text.secondary" mb={3} textAlign="center">
            {t("auth.enter_code")}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Code"
              type="text"
              inputMode="numeric"
              fullWidth
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              sx={{ mb: 2 }}
              inputProps={{ maxLength: 6 }}
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {t("auth.verify")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
