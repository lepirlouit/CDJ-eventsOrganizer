import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import { answerChallenge, getPendingUser, clearPendingUser } from "../../lib/auth";
import { useAuth } from "../../hooks/useAuth";

export function VerifyOtpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect back to login if there is no pending auth session
  useEffect(() => {
    if (!getPendingUser()) navigate("/login", { replace: true });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const user = getPendingUser();
    if (!user) { navigate("/login", { replace: true }); return; }

    setLoading(true);
    setError(null);
    try {
      const { accessToken, idToken } = await answerChallenge(user, otp.trim());
      clearPendingUser();
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
