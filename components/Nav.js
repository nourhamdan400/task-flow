"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import Icon from "@/components/Icon";

const items = [
  ["dashboard", "/dashboard", "nav.dashboard"],
  ["folder", "/projects", "nav.myProjects"],
  ["tasks", "/tasks", "nav.tasks"],
  ["members", "/members", "nav.members"],
];

export default function Nav() {
  const { user } = useAuth();
  const { theme, t, toggleTheme } = usePreferences();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [error, setError] = useState("");
  const isAuthRoute = pathname === "/login" || pathname === "/register";

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

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
      {user && !isAuthRoute && (
        <header className="topbar workspace-topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={mobileOpen}
            aria-controls="workspace-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
          <label className="workspace-search">
            <Icon name="search" size={17} />
            <input
              type="search"
              placeholder={t("common.searchWorkspace")}
              aria-label={t("common.searchWorkspace")}
            />
          </label>
          <div className="workspace-actions">
            <Link
              className="icon-button"
              href="/tasks"
              aria-label={t("dashboard.upcoming")}
              title={t("dashboard.upcoming")}
            >
              <Icon name="bell" size={19} />
            </Link>
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label={`${t("nav.theme")}: ${t(theme === "dark" ? "theme.light" : "theme.dark")}`}
              aria-pressed={theme === "dark"}
              title={`${t("nav.theme")}: ${t(theme === "dark" ? "theme.light" : "theme.dark")}`}
              onClick={toggleTheme}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
            </button>
            <div className="topbar-user">
              <span className="avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" />
                ) : (
                  (user.displayName || user.email || "T")
                    .charAt(0)
                    .toUpperCase()
                )}
              </span>
              <span className="topbar-user-name">
                {user.displayName || user.email}
              </span>
            </div>
          </div>
        </header>
      )}
      {isAuthRoute && (
        <button
          className="icon-button auth-theme-toggle"
          type="button"
          aria-label={`${t("nav.theme")}: ${t(theme === "dark" ? "theme.light" : "theme.dark")}`}
          aria-pressed={theme === "dark"}
          title={`${t("nav.theme")}: ${t(theme === "dark" ? "theme.light" : "theme.dark")}`}
          onClick={toggleTheme}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
        </button>
      )}
      {error && (
        <p className="toast-error" role="alert">
          {error}
        </p>
      )}
      {user && !isAuthRoute ? (
        <div className="app-shell">
          {mobileOpen && (
            <button
              type="button"
              aria-label={t("nav.closeMenu")}
              className="sidebar-backdrop"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <aside
            id="workspace-navigation"
            className={`tf-sidebar ${mobileOpen ? "sidebar-open" : ""}`}
          >
            <Link className="tf-sidebar-brand" href="/dashboard">
              <span className="tf-brand-mark">
                <Icon name="check" size={17} />
              </span>
              <span>{t("app.name")}</span>
            </Link>
            <nav className="tf-sidebar-nav" aria-label={t("nav.workspace")}>
              {items.map(([icon, href, key]) => {
                const active =
                  pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link ${active ? "active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon name={icon} />
                    <span>{t(key)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="sidebar-bottom tf-sidebar-bottom">
              <Link
                className={`nav-link ${pathname === "/calendar" ? "active" : ""}`}
                href="/calendar"
                onClick={() => setMobileOpen(false)}
              >
                <Icon name="calendar" />
                <span>{t("nav.calendar")}</span>
              </Link>
              <Link
                className={`nav-link ${pathname === "/settings" ? "active" : ""}`}
                href="/settings"
                onClick={() => setMobileOpen(false)}
              >
                <Icon name="settings" />
                <span>{t("nav.settings")}</span>
              </Link>
              <div className="sidebar-account">
                <span className="avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" />
                  ) : (
                    (user.displayName || user.email || "T")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </span>
                <span className="account-details">
                  <strong>{user.displayName || user.email}</strong>
                  <small>{user.email}</small>
                </span>
              </div>
              <button
                className="nav-link signout-button"
                type="button"
                onClick={logout}
              >
                <Icon name="logout" />
                <span>{t("nav.signOut")}</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
