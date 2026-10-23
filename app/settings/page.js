"use client";

import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";

export default function SettingsPage() {
  const { user } = useRequireAuth();
  const { language, theme, setLanguage, setTheme, t } = usePreferences();
  return <>
    <div className="page-heading"><div><p className="eyebrow">{t("nav.workspace")}</p><h1>{t("settings.title")}</h1><p>{t("settings.subtitle")}</p></div></div>
    <section className="card settings-section">
      <h2>{t("settings.appearance")}</h2><p>{t("settings.subtitle")}</p>
      <div className="setting-row"><div className="setting-label"><strong>{t("settings.language")}</strong><span>{t("nav.language")}</span></div>
        <div className="segmented" role="group" aria-label={t("settings.language")}>
          <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")} type="button">English</button>
          <button className={language === "ar" ? "selected" : ""} onClick={() => setLanguage("ar")} type="button">العربية</button>
        </div>
      </div>
      <div className="setting-row"><div className="setting-label"><strong>{t("settings.theme")}</strong><span>{t("nav.theme")}</span></div>
        <div className="segmented" role="group" aria-label={t("settings.theme")}>
          <button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")} type="button">{t("theme.light")}</button>
          <button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")} type="button">{t("theme.dark")}</button>
        </div>
      </div>
    </section>
    <section className="card settings-section">
      <h2>{t("settings.account")}</h2><p>{t("settings.accountHint")}</p>
      <div className="setting-row"><div className="setting-label"><strong>{t("settings.name")}</strong><span>{t("settings.profile")}</span></div><span>{user?.displayName || "—"}</span></div>
      <div className="setting-row"><div className="setting-label"><strong>{t("settings.email")}</strong><span>{t("settings.profile")}</span></div><span>{user?.email || "—"}</span></div>
    </section>
  </>;
}
