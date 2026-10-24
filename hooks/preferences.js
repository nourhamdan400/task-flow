"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translate } from "@/lib/i18n";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [language, setLanguageState] = useState("en");
  const [theme, setThemeState] = useState("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem("taskflow-language");
    const savedTheme = localStorage.getItem("taskflow-theme");
    const nextLanguage = savedLanguage === "ar" ? "ar" : "en";
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setLanguageState(nextLanguage);
    setThemeState(nextTheme);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.title = translate(language, "app.title");
    localStorage.setItem("taskflow-language", language);
    localStorage.setItem("taskflow-theme", theme);
  }, [hydrated, language, theme]);

  const t = useCallback(
    (key, values) => translate(language, key, values),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      theme,
      setLanguage(next) {
        setLanguageState(next === "ar" ? "ar" : "en");
      },
      toggleLanguage() {
        setLanguageState((current) => (current === "ar" ? "en" : "ar"));
      },
      setTheme(next) {
        setThemeState(next === "dark" ? "dark" : "light");
      },
      toggleTheme() {
        setThemeState((current) => (current === "dark" ? "light" : "dark"));
      },
      t,
    }),
    [language, theme, t],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context)
    throw new Error("usePreferences must be used within PreferencesProvider");
  return context;
}
