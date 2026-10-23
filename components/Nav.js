"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import Icon from "@/components/Icon";

const items = [
  ["dashboard", "/dashboard", "nav.dashboard"],
  ["tasks", "/tasks", "nav.tasks"],
  ["projects", "/projects", "nav.projects"],
  ["calendar", "/calendar", "nav.calendar"],
  ["settings", "/settings", "nav.settings"],
];

export default function Nav() {
  const { user } = useAuth();
  const { language, theme, t, toggleLanguage, toggleTheme } = usePreferences();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");

  const logout = async () => {
    try {
      await signOut(auth);
      setError("");
    } catch {
      setError(t("common.error"));
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="icon-button mobile-menu" type="button" aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          onClick={() => setMobileOpen(!mobileOpen)}>
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>
        <Link className="brand" href={user ? "/dashboard" : "/login"}>
          <span className="brand-mark">T</span><span>{t("app.name")}</span>
        </Link>
        <span className="topbar-spacer" />
        <button className="icon-button language-button" type="button" onClick={toggleLanguage} aria-label={t("nav.language")}>
          {language === "ar" ? "EN" : "ع"}
        </button>
        <button className="icon-button" type="button" onClick={toggleTheme} aria-label={t("nav.theme")}
          title={`${t("nav.theme")}: ${t(theme === "dark" ? "theme.light" : "theme.dark")}`}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        {user && <div className="topbar-user"><span className="avatar">{(user.displayName || user.email || "T").charAt(0).toUpperCase()}</span><span className="topbar-user-name">{user.displayName || user.email}</span></div>}
      </header>
      {error && <p className="toast-error" role="alert">{error}</p>}
      {user ? (
        <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
          {mobileOpen && <button type="button" aria-label={t("nav.closeMenu")} className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
          <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
            <div className="sidebar-heading">{!collapsed && <span>{t("nav.workspace")}</span>}
              <button className="icon-button collapse-button" type="button" onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}><Icon name="chevron" /></button>
            </div>
            <nav className="sidebar-nav" aria-label={t("nav.workspace")}>
              {items.map(([icon, href, key]) => {
                const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                return <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}
                  onClick={() => setMobileOpen(false)} title={collapsed ? t(key) : undefined}>
                  <Icon name={icon} /><span>{t(key)}</span>
                </Link>;
              })}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-account">
                <span className="avatar">{(user.displayName || user.email || "T").charAt(0).toUpperCase()}</span>
                {!collapsed && <span className="account-details"><strong>{user.displayName || user.email}</strong><small>{user.email}</small></span>}
              </div>
              <button className="nav-link signout-button" type="button" onClick={logout} title={collapsed ? t("nav.signOut") : undefined}>
                <Icon name="logout" /><span>{t("nav.signOut")}</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
