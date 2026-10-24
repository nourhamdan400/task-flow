"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { db } from "@/lib/firebase";
import { getWorkspaceProjects } from "@/lib/workspace";
import Icon from "@/components/Icon";

const projectColors = ["green", "blue", "amber", "violet"];
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timestamp(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function dateFromKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function calendarDates(month) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const count = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from(
    { length: count },
    (_, index) =>
      new Date(month.getFullYear(), month.getMonth(), index - offset + 1),
  );
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = usePreferences();
  const router = useRouter();
  const [projects, setProjects] = useState(null);
  const [members, setMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [updatingTask, setUpdatingTask] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user) return undefined;
    let active = true;
    setLoading(true);
    setError("");
    getWorkspaceProjects(user.uid)
      .then(async (result) => {
        if (active) setProjects(result);
        const memberIds = [
          ...new Set(result.flatMap((project) => project.memberIds || [])),
        ];
        const profiles = await Promise.allSettled(
          memberIds.map((uid) => getDoc(doc(db, "users", uid))),
        );
        if (!active) return;
        setMembers(
          Object.fromEntries(
            profiles
              .filter(
                (profile) =>
                  profile.status === "fulfilled" && profile.value.exists(),
              )
              .map((profile) => [profile.value.id, profile.value.data()]),
          ),
        );
      })
      .catch(() => {
        if (active) setError(t("common.error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, t, retry]);

  const tasks = useMemo(
    () =>
      (projects || []).flatMap((project) =>
        (project.tasks || []).map((task) => ({
          ...task,
          projectName: project.name,
          projectId: project.id,
          ownerId: project.ownerId,
        })),
      ),
    [projects],
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const dueSoon = tasks.filter((task) => {
    const dueDate = dateFromKey(task.dueDate);
    return (
      task.status !== "done" &&
      dueDate &&
      dueDate >= today &&
      dueDate <= weekAhead
    );
  }).length;
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.status !== "done" && dateFromKey(task.dueDate) >= today,
        )
        .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
        .slice(0, 5),
    [tasks, today],
  );
  const recentProjects = useMemo(
    () =>
      [...(projects || [])]
        .sort(
          (first, second) =>
            timestamp(second.createdAt) - timestamp(first.createdAt),
        )
        .slice(0, 4),
    [projects],
  );
  const allMemberIds = [
    ...new Set((projects || []).flatMap((project) => project.memberIds || [])),
  ];
  const dates = useMemo(() => calendarDates(month), [month]);
  const datesWithTasks = new Set(
    tasks
      .filter((task) => task.status !== "done" && task.dueDate)
      .map((task) => task.dueDate),
  );
  const monthLabel = new Intl.DateTimeFormat(language, {
    month: "long",
    year: "numeric",
  }).format(month);
  const weekdayLabels = weekdays.map((_, index) =>
    new Intl.DateTimeFormat(language, { weekday: "short" }).format(
      new Date(2024, 0, index + 7),
    ),
  );
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12
      ? "dashboard.morning"
      : greetingHour < 18
        ? "dashboard.afternoon"
        : "dashboard.evening";
  const dateFormatter = new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
  });

  const completeTask = async (task) => {
    if (
      updatingTask ||
      !(
        task.ownerId === user.uid ||
        task.createdBy === user.uid ||
        task.assigneeId === user.uid
      )
    )
      return;
    setUpdatingTask(task.id);
    try {
      await updateDoc(doc(db, "projects", task.projectId, "tasks", task.id), {
        status: "done",
        updatedAt: serverTimestamp(),
      });
      setProjects((current) =>
        current.map((project) =>
          project.id !== task.projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((item) =>
                  item.id === task.id ? { ...item, status: "done" } : item,
                ),
              },
        ),
      );
      setError("");
    } catch {
      setError(t("project.updateStatusError"));
    } finally {
      setUpdatingTask("");
    }
  };

  if (authLoading || (!user && !error)) {
    return (
      <div className="dashboard-loading" role="status">
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return null;
  if (loading && projects === null) {
    return (
      <div className="dashboard-loading" role="status" aria-busy="true">
        {t("common.loading")}
      </div>
    );
  }
  if (error && projects === null) {
    return (
      <section className="empty-state" role="alert">
        <h3>{error}</h3>
        <p>{t("dashboard.loadErrorHint")}</p>
        <button
          className="btn primary"
          onClick={() => setRetry((value) => value + 1)}
        >
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const summary = [
    ["folder", projects.length, "dashboard.totalProjects", "green"],
    ["tasks", tasks.length, "dashboard.totalTasks", "blue"],
    ["clock", dueSoon, "dashboard.dueSoon", "amber"],
    ["members", allMemberIds.length, "dashboard.teamMembers", "violet"],
  ];

  return (
    <div className="dashboard-shell w-full min-h-screen overflow-x-hidden">
      <div className="tf-dashboard-grid grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section
          className="dashboard-main-column min-w-0 lg:col-span-8"
          aria-label={t("nav.dashboard")}
        >
          <div className="welcome-card">
            <div className="welcome-copy">
              <p>{t(greeting)},</p>
              <h1>
                {user.displayName || user.email?.split("@")[0] || t("app.name")}{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <small>{t("dashboard.subtitle")}</small>
            </div>
            <div className="welcome-illustration" aria-hidden="true">
              <div className="welcome-clipboard">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>

          <section className="summary-grid" aria-label={t("nav.dashboard")}>
            {summary.map(([icon, value, label, color]) => (
              <article className="summary-card" key={label}>
                <span className={`summary-icon ${color}`}>
                  <Icon name={icon} size={18} />
                </span>
                <strong>{value}</strong>
                <span>{t(label)}</span>
              </article>
            ))}
          </section>

          <div className="dashboard-section-heading">
            <h2>{t("dashboard.projects")}</h2>
            <Link href="/projects">
              {t("dashboard.viewAll")} <Icon name="arrow" size={13} />
            </Link>
          </div>
          {recentProjects.length === 0 ? (
            <div className="dashboard-empty">
              <strong>{t("dashboard.noProjects")}</strong>
              <p>{t("dashboard.noProjectsHint")}</p>
              <Link className="text-link" href="/projects/new">
                {t("projects.create")}
              </Link>
            </div>
          ) : (
            <div className="dashboard-project-grid grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentProjects.map((project, index) => {
                const projectTasks = project.tasks || [];
                const completed = projectTasks.filter(
                  (task) => task.status === "done",
                ).length;
                const progress = projectTasks.length
                  ? Math.round((completed / projectTasks.length) * 100)
                  : 0;
                const projectMembers = (project.memberIds || []).slice(0, 3);
                return (
                  <Link
                    className="dashboard-project"
                    key={project.id}
                    href={`/projects/${project.id}`}
                  >
                    <span
                      className={`project-icon ${projectColors[index % projectColors.length]}`}
                    >
                      <Icon
                        name={index % 2 ? "dashboard" : "folder"}
                        size={18}
                      />
                    </span>
                    <h3>{project.name}</h3>
                    <p>{project.description || t("common.noDescription")}</p>
                    <div
                      className="project-progress"
                      role="progressbar"
                      aria-label={`${project.name} ${t("projects.progress")}`}
                      aria-valuenow={progress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                    <div className="project-card-footer">
                      <span
                        className="avatar-stack"
                        aria-label={`${project.memberIds?.length || 0} ${t("dashboard.teamMembers")}`}
                      >
                        {projectMembers.map((uid) => {
                          const profile = members[uid];
                          return (
                            <span
                              className="member-avatar"
                              key={uid}
                              title={
                                profile?.displayName || profile?.email || uid
                              }
                            >
                              {profile?.photoURL ? (
                                <img src={profile.photoURL} alt="" />
                              ) : (
                                (profile?.displayName || profile?.email || uid)
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </span>
                          );
                        })}
                      </span>
                      <span>
                        {t("dashboard.taskCount", {
                          done: completed,
                          total: projectTasks.length,
                        })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {error && (
            <p className="status-message err" role="alert">
              {error}
            </p>
          )}
        </section>

        <aside
          className="dashboard-rail min-w-0 lg:col-span-4"
          aria-label={t("dashboard.upcoming")}
        >
          <section className="rail-panel">
            <div className="dashboard-section-heading">
              <h2>{t("dashboard.upcoming")}</h2>
              <Link href="/tasks">
                {t("dashboard.viewAll")} <Icon name="arrow" size={13} />
              </Link>
            </div>
            {upcomingTasks.length === 0 ? (
              <p className="dashboard-empty">{t("dashboard.noUpcoming")}</p>
            ) : (
              <ul className="upcoming-list">
                {upcomingTasks.map((task) => {
                  const canComplete =
                    task.ownerId === user.uid ||
                    task.createdBy === user.uid ||
                    task.assigneeId === user.uid;
                  return (
                    <li
                      className="upcoming-item"
                      key={`${task.projectId}-${task.id}`}
                    >
                      <button
                        className="task-check"
                        type="button"
                        aria-label={`${t("dashboard.markComplete")}: ${task.title}`}
                        aria-pressed="false"
                        disabled={!canComplete || updatingTask === task.id}
                        onClick={() => completeTask(task)}
                      >
                        <Icon name="check" size={11} />
                      </button>
                      <div>
                        <Link
                          className="upcoming-title"
                          href={`/projects/${task.projectId}`}
                        >
                          {task.title}
                        </Link>
                        <div className="upcoming-meta">
                          <span
                            className={`priority-pill priority-${task.priority || "low"}`}
                          >
                            {t(`priority.${task.priority || "low"}`)}
                          </span>
                          <time dateTime={task.dueDate}>
                            {dateFormatter.format(dateFromKey(task.dueDate))}
                          </time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rail-panel" aria-label={t("nav.calendar")}>
            <div className="calendar-widget-header">
              <Link className="calendar-month-link" href="/calendar">
                {monthLabel}
              </Link>
              <div className="calendar-widget-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={t("calendar.previous")}
                  onClick={() =>
                    setMonth(
                      (value) =>
                        new Date(value.getFullYear(), value.getMonth() - 1, 1),
                    )
                  }
                >
                  <Icon
                    name="chevron"
                    size={15}
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={t("calendar.next")}
                  onClick={() =>
                    setMonth(
                      (value) =>
                        new Date(value.getFullYear(), value.getMonth() + 1, 1),
                    )
                  }
                >
                  <Icon name="chevron" size={15} />
                </button>
              </div>
            </div>
            <div className="mini-calendar">
              {weekdayLabels.map((day, index) => (
                <span className="mini-calendar-label" key={`${day}-${index}`}>
                  {day}
                </span>
              ))}
              {dates.map((date) => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
                const todayMatches =
                  date.toDateString() === new Date().toDateString();
                const outside = date.getMonth() !== month.getMonth();
                return (
                  <span
                    key={key}
                    className={`mini-calendar-day ${todayMatches ? "today" : ""} ${outside ? "outside" : ""} ${datesWithTasks.has(key) ? "has-task" : ""}`}
                    aria-label={date.toLocaleDateString(language)}
                  >
                    {date.getDate()}
                  </span>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
