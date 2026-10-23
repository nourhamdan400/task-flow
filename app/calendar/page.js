"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { getWorkspaceProjects } from "@/lib/workspace";
import Icon from "@/components/Icon";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const { user } = useRequireAuth();
  const { t, language } = usePreferences();
  const [projects, setProjects] = useState(null);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getWorkspaceProjects(user.uid).then(setProjects).catch(() => setError(t("common.error")));
  }, [user, t]);

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), index - offset + 1));
  }, [month]);
  const events = useMemo(() => (projects || []).flatMap((project) => project.tasks
    .filter((task) => task.dueDate && task.status !== "done")
    .map((task) => ({ ...task, projectName: project.name, projectId: project.id }))), [projects]);
  const hasMonthEvents = events.some((task) => {
    const [year, monthValue] = task.dueDate.split("-").map(Number);
    return year === month.getFullYear() && monthValue === month.getMonth() + 1;
  });
  const dateFormat = new Intl.DateTimeFormat(language, { year: "numeric", month: "long" });
  const dayNames = weekdays.map((day) => new Intl.DateTimeFormat(language, { weekday: "short" }).format(new Date(`2024-01-${String(1 + weekdays.indexOf(day)).padStart(2, "0")}T12:00:00`)));
  const today = new Date();
  const sameDay = (date, value) => {
    const [year, monthValue, day] = value.split("-").map(Number);
    return date.getFullYear() === year && date.getMonth() === monthValue - 1 && date.getDate() === day;
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">{t("nav.workspace")}</p><h1>{t("calendar.title")}</h1><p>{t("calendar.subtitle")}</p></div></div>
    <div className="calendar-toolbar">
      <button className="icon-button" type="button" aria-label={t("calendar.previous")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Icon name="chevron" style={{ transform: "rotate(180deg)" }} /></button>
      <h2>{dateFormat.format(month)}</h2>
      <button className="icon-button" type="button" aria-label={t("calendar.next")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Icon name="chevron" /></button>
    </div>
    {error ? <p className="status-message err" role="alert">{error}</p> : projects === null ?
      <p className="status-message muted" role="status">{t("common.loading")}</p> : <>
        <div className="calendar-grid">
          {dayNames.map((day, index) => <div className="calendar-weekday" key={`${day}-${index}`}>{day}</div>)}
          {days.map((date) => {
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            return <div key={dateKey} className={`calendar-day ${date.getMonth() === month.getMonth() ? "" : "outside"} ${date.toDateString() === today.toDateString() ? "today" : ""}`}>
              <span className="calendar-day-number">{new Intl.DateTimeFormat(language, { day: "numeric" }).format(date)}</span>
              {events.filter((task) => sameDay(date, task.dueDate)).map((task) => <Link key={`${task.projectId}-${task.id}`} className="calendar-event" title={`${task.title} · ${task.projectName}`} href={`/projects/${task.projectId}`}>{task.title}</Link>)}
            </div>;
          })}
        </div>
        {!hasMonthEvents && <p className="muted">{t("calendar.noTasks")}</p>}
      </>}
  </>;
}
