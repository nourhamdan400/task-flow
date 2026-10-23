"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { getWorkspaceProjects } from "@/lib/workspace";
import { isOverdue } from "@/lib/utils";
import { doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Icon from "@/components/Icon";

export default function TasksPage() {
  const { user } = useRequireAuth();
  const { t } = usePreferences();
  const [projects, setProjects] = useState(null);
  const [filters, setFilters] = useState({ search: "", project: "", status: "", priority: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getWorkspaceProjects(user.uid).then(setProjects).catch(() => setError(t("common.error")));
  }, [user, t]);

  const tasks = useMemo(() => (projects || []).flatMap((project) =>
    project.tasks.filter((task) => task.assigneeId === user?.uid).map((task) => ({ ...task, projectName: project.name, projectId: project.id }))), [projects, user]);
  const shown = useMemo(() => tasks.filter((task) =>
    (!filters.project || task.projectId === filters.project) &&
    (!filters.status || task.status === filters.status) &&
    (!filters.priority || task.priority === filters.priority) &&
    `${task.title} ${task.description || ""}`.toLowerCase().includes(filters.search.toLowerCase())
  ).sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999")), [tasks, filters]);

  const changeStatus = async (task, status) => {
    try {
      await updateDoc(doc(db, "projects", task.projectId, "tasks", task.id), { status, updatedAt: serverTimestamp() });
      setProjects((current) => current.map((project) => project.id !== task.projectId ? project : {
        ...project, tasks: project.tasks.map((item) => item.id === task.id ? { ...item, status } : item),
      }));
      setError("");
    } catch {
      setError(t("project.updateStatusError"));
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm(t("task.deleteConfirm"))) return;
    try {
      await writeBatch(db).delete(doc(db, "projects", task.projectId, "tasks", task.id)).commit();
      setProjects((current) => current.map((project) => project.id !== task.projectId ? project : {
        ...project, tasks: project.tasks.filter((item) => item.id !== task.id),
      }));
      setError("");
    } catch {
      setError(t("project.deleteError"));
    }
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">{t("nav.workspace")}</p><h1>{t("tasks.title")}</h1><p>{t("tasks.subtitle")}</p></div></div>
    <div className="card toolbar">
      <label className="search-wrap"><Icon name="search" size={17} /><input placeholder={t("tasks.search")} aria-label={t("tasks.search")} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
      <select aria-label={t("tasks.allProjects")} value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })}>
        <option value="">{t("tasks.allProjects")}</option>{(projects || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <select aria-label={t("tasks.allStatuses")} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
        <option value="">{t("tasks.allStatuses")}</option>{["todo", "in_progress", "done"].map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
      </select>
      <select aria-label={t("tasks.allPriorities")} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
        <option value="">{t("tasks.allPriorities")}</option>{["low", "medium", "high"].map((priority) => <option key={priority} value={priority}>{t(`priority.${priority}`)}</option>)}
      </select>
    </div>
    {error && projects !== null && <p className="status-message err" role="alert">{error}</p>}
    {projects === null ? error ? <p className="status-message err" role="alert">{error}</p> :
      <p className="status-message muted" role="status">{t("common.loading")}</p> :
      shown.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="tasks" /></span><h3>{t("tasks.empty")}</h3><p>{t("tasks.emptyHint")}</p></div> :
      <div className="grid">{shown.map((task) => <article className="card task-card" key={`${task.projectId}-${task.id}`}>
        <h3>{task.title}</h3>{task.description && <p>{task.description}</p>}
        <Link className="task-row-project" href={`/projects/${task.projectId}`}>{task.projectName}</Link>
        <div className="task-card-meta"><span className={`badge status-${task.status}`}>{t(`status.${task.status}`)}</span>
          <span className={`badge priority-${task.priority}`}>{t(`priority.${task.priority}`)}</span>
          {isOverdue(task) && <span className="badge warn">{t("common.overdue")}</span>}
          <span>{task.dueDate ? `${t("common.due")}: ${task.dueDate}` : t("date.noDate")}</span>
        </div>
        <div className="task-card-actions">
          <select aria-label={t("project.status")} value={task.status} onChange={(event) => changeStatus(task, event.target.value)}>
            {["todo", "in_progress", "done"].map((status) => <option key={status} value={status}>{t(`status.${status}`)}</option>)}
          </select>
          <Link className="btn" href={`/projects/${task.projectId}`}>{t("tasks.openProject")}</Link>
          {(projects.find((project) => project.id === task.projectId)?.ownerId === user.uid || task.createdBy === user.uid) &&
            <button className="btn danger" onClick={() => deleteTask(task)}>{t("common.delete")}</button>}
        </div>
      </article>)}</div>}
  </>;
}
