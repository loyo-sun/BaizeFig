import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  readLanguage,
  writeLanguage,
  translate,
  type Language,
  type TranslationValues,
} from "./i18n";
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
  persistenceError: boolean;
  t: (source: string, values?: TranslationValues) => string;
} | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(readLanguage);
  const [persistenceError, setPersistenceError] = useState(false);
  const setLanguage = useCallback((next: Language) => {
    if (next !== "zh-CN" && next !== "en") return;
    setPersistenceError(!writeLanguage(next));
    updateLanguage(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title =
      language === "zh-CN"
        ? "BaizeFig · 通万物、识万象"
        : "BaizeFig · Understand all things. See every form.";
  }, [language]);
  const t = useCallback(
    (source: string, values?: TranslationValues) =>
      translate(language, source, values),
    [language],
  );
  const context = useMemo(
    () => ({ language, setLanguage, persistenceError, t }),
    [language, setLanguage, persistenceError, t],
  );
  return (
    <LanguageContext.Provider value={context}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) throw Error("LanguageProvider is required");
  return context;
}
