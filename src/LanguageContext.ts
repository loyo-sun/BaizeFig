import { createContext, useContext } from "react";
import type { Language, TranslationValues } from "./i18n";
export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  persistenceError: boolean;
  t: (source: string, values?: TranslationValues) => string;
} | null>(null);
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw Error("LanguageProvider is required");
  return context;
}
