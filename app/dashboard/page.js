"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { getWorkspaceProjects } from "@/lib/workspace";
import Icon from "@/components/Icon";

function getTimestamp(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = usePreferences();
  const router = useRouter();
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    let active = true;
    setLoading(true);
    setError("");
    getWorkspaceProjects(user.uid)
      .then((result) => {
        if (active) setProjects(result);
      })
      .catch((loadError) => {
        console.error(
          "Failed to load dashboard data from Firestore:",
          loadError,
        );
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
        project.tasks.map((task) => ({
          ...task,
          projectName: project.name,
          projectId: project.id,
        })),
      ),
    [projects],
  );

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort(
          (a, b) =>
            getTimestamp(b.createdAt || b.updatedAt) -
            getTimestamp(a.createdAt || a.updatedAt),
        )
        .slice(0, 6),
    [tasks],
  );

  if (authLoading || (!user && !error)) {
    return (
      <p className="status-message muted" role="status">
        {t("common.loading")}
      </p>
    );
  }

  if (!user) return null;

  if (loading && projects === null) {
    return (
      <section aria-label={t("common.loading")} aria-busy="true">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{t("nav.dashboard")}</p>
            <h1>{t("common.loading")}</h1>
          </div>
        </div>
        <div className="stats-grid">
          {[0, 1, 2].map((item) => (
            <div className="card stat-card dashboard-skeleton" key={item} />
          ))}
        </div>
        <div className="card task-list dashboard-skeleton-list" />
      </section>
    );
  }

  if (error && projects === null) {
    return (
      <section className="empty-state" role="alert">
        <span className="empty-icon">
          <Icon name="tasks" />
        </span>
        <h3>{error}</h3>
        <p>{t("dashboard.loadErrorHint")}</p>
        <button
          className="btn primary"
          type="button"
          onClick={() => setRetry((value) => value + 1)}
        >
          {t("common.retry")}
        </button>
      </section>
    );
  }

  const completed = tasks.filter((task) => task.status === "done").length;
  const pending = tasks.filter((task) => task.status !== "done").length;
  const stats = [
    ["tasks", tasks.length, "dashboard.totalTasks", "total"],
    ["check", completed, "dashboard.completed", "completed"],
    ["clock", pending, "dashboard.pending", "pending"],
  ];
  const recentProjects = [...(projects || [])]
    .sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt))
    .slice(0, 4);

  const formatDate = (value) => {
    if (!value) return t("date.noDate");
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return t("date.noDate");
    return date.toLocaleDateString(language, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("nav.dashboard")}</p>
          <h1>
            {t("dashboard.greeting")}
            {user.displayName ? `, ${user.displayName}` : ""}
          </h1>
          <p>{t("dashboard.subtitle")}</p>
        </div>
        <Link className="btn primary" href="/projects/new">
          <Icon name="plus" size={17} />
          {t("dashboard.newProject")}
        </Link>
      </div>

      <section className="stats-grid" aria-label={t("nav.dashboard")}>
        {stats.map(([icon, count, label, key]) => (
          <article className="card stat-card" key={key}>
            <Icon name={icon} className="stat-icon" size={18} />
            <span>{t(label)}</span>
            <b>{count}</b>
          </article>
        ))}
      </section>

      <div className="section-heading">
        <h2>{t("dashboard.recentTasks")}</h2>
        <Link className="text-link" href="/tasks">
          {t("dashboard.viewAll")} <Icon name="arrow" size={15} />
        </Link>
      </div>

      {loading ? (
        <div
          className="card task-list dashboard-skeleton-list"
          role="status"
          aria-label={t("common.loading")}
        />
      ) : error ? (
        <p className="status-message err" role="alert">
          {error}
        </p>
      ) : recentTasks.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="check" />
          </span>
          <h3>{t("dashboard.noTasksYet")}</h3>
          <p>{t("dashboard.noTasksHint")}</p>
          {projects.length === 0 && (
            <Link className="btn primary" href="/projects/new">
              <Icon name="plus" size={17} />
              {t("dashboard.newProject")}
            </Link>
          )}
        </div>
      ) : (
        <div className="card task-list">
          {recentTasks.map((task) => (
            <article className="task-row" key={`${task.projectId}-${task.id}`}>
              <div>
                <Link
                  className="task-row-title"
                  href={`/projects/${task.projectId}`}
                >
                  {task.title}
                </Link>
                <span className="task-row-project">{task.projectName}</span>
              </div>
              <span className={`badge status-${task.status}`}>
                {t(`status.${task.status}`)}
              </span>
              <time
                className="task-row-date"
                dateTime={task.dueDate || undefined}
              >
                {formatDate(task.dueDate)}
              </time>
            </article>
          ))}
        </div>
      )}

      <div className="section-heading">
        <h2>{t("dashboard.projects")}</h2>
        <Link className="text-link" href="/projects">
          {t("dashboard.viewAll")} <Icon name="arrow" size={15} />
        </Link>
      </div>
      {loading && projects === null ? (
        <p className="status-message muted" role="status">
          {t("common.loading")}
        </p>
      ) : recentProjects.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="projects" />
          </span>
          <h3>{t("dashboard.emptyProjects")}</h3>
          <p>{t("dashboard.emptyProjectsHint")}</p>
          <Link className="btn primary" href="/projects/new">
            {t("projects.create")}
          </Link>
        </div>
      ) : (
        <div className="grid">
          {recentProjects.map((project) => {
            const projectCompleted = project.tasks.filter(
              (task) => task.status === "done",
            ).length;
            const progress = project.tasks.length
              ? Math.round((projectCompleted / project.tasks.length) * 100)
              : 0;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card project-card"
              >
                <div className="project-card-top">
                  <h3>{project.name}</h3>
                  <span
                    className={`badge ${progress === 100 && project.tasks.length ? "status-done" : "status-in_progress"}`}
                  >
                    {progress === 100 && project.tasks.length
                      ? t("projects.complete")
                      : t("projects.active")}
                  </span>
                </div>
                <p>{project.description || t("common.noDescription")}</p>
                <div className="progress-label">
                  <span>{t("projects.progress")}</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="project-meta">
                  <span>
                    {project.tasks.length} {t("common.tasks")}
                  </span>
                  <span>
                    {project.ownerId === user.uid
                      ? t("projects.owner")
                      : t("projects.member")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
