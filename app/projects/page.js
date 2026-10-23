"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { getWorkspaceProjects } from "@/lib/workspace";
import Icon from "@/components/Icon";

export default function ProjectsPage() {
  const { user } = useRequireAuth();
  const { t } = usePreferences();
  const [projects, setProjects] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getWorkspaceProjects(user.uid).then(setProjects).catch(() => setError(t("common.error")));
  }, [user, t]);

  const shown = useMemo(() => (projects || []).filter((project) =>
    `${project.name} ${project.description || ""}`.toLowerCase().includes(search.trim().toLowerCase())), [projects, search]);

  return <>
    <div className="page-heading"><div><p className="eyebrow">{t("nav.workspace")}</p><h1>{t("projects.title")}</h1><p>{t("projects.subtitle")}</p></div>
      <Link className="btn primary" href="/projects/new"><Icon name="plus" size={17} />{t("projects.create")}</Link></div>
    <div className="card toolbar"><label className="search-wrap"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("projects.search")} aria-label={t("projects.search")} /></label></div>
    {error ? <p className="status-message err" role="alert">{error}</p> : projects === null ?
      <p className="status-message muted" role="status">{t("common.loading")}</p> :
      shown.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="projects" /></span><h3>{t("projects.empty")}</h3><p>{t("projects.emptyHint")}</p>
        {!search && <Link className="btn primary" href="/projects/new">{t("projects.create")}</Link>}</div> :
      <div className="grid">{shown.map((project) => {
        const completed = project.tasks.filter((task) => task.status === "done").length;
        const progress = project.tasks.length ? Math.round(completed / project.tasks.length * 100) : 0;
        return <Link key={project.id} href={`/projects/${project.id}`} className="card project-card">
          <div className="project-card-top"><h3>{project.name}</h3><span className={`badge ${progress === 100 && project.tasks.length ? "status-done" : "status-in_progress"}`}>
            {progress === 100 && project.tasks.length ? t("projects.complete") : t("projects.active")}</span></div>
          <p>{project.description || t("common.noDescription")}</p>
          <div className="progress-label"><span>{t("projects.progress")}</span><span>{progress}%</span></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <div className="project-meta"><span>{project.tasks.length} {t("common.tasks")}</span><span>{project.ownerId === user.uid ? t("projects.owner") : t("projects.member")}</span></div>
        </Link>;
      })}</div>}
  </>;
}
