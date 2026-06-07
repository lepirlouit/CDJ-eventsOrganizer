import React from "react";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { styled } from "@mui/material/styles";

const LANGS = [
  { code: "fr", label: "FR" },
  { code: "nl", label: "NL" },
  { code: "en", label: "EN" },
] as const;

const LangButton = styled(Button, {
  shouldForwardProp: (p) => p !== "active",
})<{ active?: boolean }>(({ theme, active }) => ({
  minWidth: 36,
  padding: "2px 6px",
  fontSize: "0.75rem",
  fontWeight: active ? 700 : 400,
  color: "inherit",
  opacity: active ? 1 : 0.65,
  borderRadius: 4,
  border: active ? "1px solid rgba(255,255,255,0.6)" : "1px solid transparent",
  "&:hover": { opacity: 1, border: "1px solid rgba(255,255,255,0.4)" },
}));

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <Box display="flex" gap={0.25} mr={1}>
      {LANGS.map(({ code, label }) => (
        <LangButton
          key={code}
          active={current.startsWith(code)}
          onClick={() => i18n.changeLanguage(code)}
          disableRipple={current.startsWith(code)}
        >
          {label}
        </LangButton>
      ))}
    </Box>
  );
}
