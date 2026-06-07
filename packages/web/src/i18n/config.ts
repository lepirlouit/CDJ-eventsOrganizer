import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en/common.json";
import fr from "./locales/fr/common.json";
import nl from "./locales/nl/common.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "fr", "nl"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    detection: {
      // Check localStorage first, then browser preference
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "cdj-lang",
    },
    resources: {
      en: { common: en },
      fr: { common: fr },
      nl: { common: nl },
    },
  });

export default i18n;
