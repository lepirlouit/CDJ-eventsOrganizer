import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import {
  answerChallenge,
  getPendingUser,
  clearPendingUser,
  redeemMagicLink,
} from "../../lib/auth";
import { useAuth } from "../../hooks/useAuth";

export function VerifyOtpPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [params] = useSearchParams();
  const emailFromUrl = params.get("email");
  const tokenFromUrl = params.get("token");

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  // When the page is opened from a magic link, redeem it automatically.
  const [autoRedeeming, setAutoRedeeming] = useState(
    Boolean(emailFromUrl && tokenFromUrl)
  );
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Complete the login with either the typed code or the magic-link token.
  // If this tab still holds the pending Cognito session (same browser that
  // started login), answer it directly; otherwise start a fresh challenge for
  // the email from the link — that path also works on a different device.
  async function complete(answer: string) {
    const pending = getPendingUser();
    const tokens = pending
      ? await answerChallenge(pending, answer)
      : await redeemMagicLink(emailFromUrl ?? "", answer, i18n.language);
    clearPendingUser();
    login(tokens.accessToken, tokens.idToken);
    navigate("/");
  }

  useEffect(() => {
    // Auto-redeem the magic link exactly once (guard against StrictMode's
    // double-invoke, which would race the single-use token).
    if (emailFromUrl && tokenFromUrl) {
      if (startedRef.current) return;
      startedRef.current = true;
      (async () => {
        try {
          await complete(tokenFromUrl);
        } catch {
          setError(t("auth.link_invalid"));
          setAutoRedeeming(false); // fall back to the manual code form
        }
      })();
      return;
    }
    // No link params: we need an in-progress session to enter a code manually.
    if (!getPendingUser()) navigate("/login", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await complete(code.trim());
    } catch {
      setError(t("auth.invalid_code"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
      <Card sx={{ width: "100%", maxWidth: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, textAlign: "center" }}>
            {t("auth.check_email")}
          </Typography>

          {autoRedeeming ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 3 }}>
              <CircularProgress />
              <Typography color="text.secondary">{t("auth.signing_in")}</Typography>
            </Box>
          ) : (
            <>
              <Typography color="text.secondary" sx={{ mb: 3, textAlign: "center" }}>
                {t("auth.magic_link_instructions")}
              </Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <form onSubmit={handleSubmit}>
                <TextField
                  label={t("auth.code_label")}
                  type="text"
                  inputMode="numeric"
                  fullWidth
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  sx={{ mb: 2 }}
                  slotProps={{ htmlInput: { maxLength: 6 } }}
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
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
