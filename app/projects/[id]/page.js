"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc, getDoc, updateDoc, collection, onSnapshot, addDoc, writeBatch, serverTimestamp,
  arrayUnion, arrayRemove, query, where, limit, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { STATUS, PRIORITY, isOverdue } from "@/lib/utils";
import TaskForm from "@/components/TaskForm";
import Icon from "@/components/Icon";

export default function ProjectPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useRequireAuth();
  const { t, language } = usePreferences();
  const [state, setState] = useState("loading");
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", assignee: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProject = async () => {
    try {
      const snapshot = await getDoc(doc(db, "projects", id));
      if (!snapshot.exists()) {
        setState("notfound");
        return;
      }
      const data = { id: snapshot.id, ...snapshot.data() };
      const users = await Promise.all(data.memberIds.map((uid) => getDoc(doc(db, "users", uid))));
      setProject(data);
      setMembers(users.filter((item) => item.exists()).map((item) => ({ uid: item.id, ...item.data() })));
      setState("ok");
    } catch (error) {
      setState(error.code === "permission-denied" ? "denied" : "error");
    }
  };

  useEffect(() => { if (user) loadProject(); }, [user, id]); // eslint-disable-line

  useEffect(() => {
    if (state !== "ok") return;
    return onSnapshot(collection(db, "projects", id, "tasks"),
      (snapshot) => setTasks(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
      () => setMessage(t("project.tasksLoadError")));
  }, [state, id, t]);

  const shown = useMemo(() => tasks
    .filter((task) => (!filters.status || task.status === filters.status) &&
      (!filters.priority || task.priority === filters.priority) &&
      (!filters.assignee || task.assigneeId === filters.assignee) &&
      task.title.toLowerCase().includes(filters.search.toLowerCase()))
    .sort((a, b) => (a.dueDate || "9").localeCompare(b.dueDate || "9")), [tasks, filters]);

  if (state === "loading") return <p className="status-message muted" role="status">{t("common.loading")}</p>;
  if (state === "denied") return <p className="status-message err" role="alert">{t("project.accessDenied")}</p>;
  if (state === "notfound") return <p className="status-message">{t("project.notFound")}</p>;
  if (state === "error") return <p className="status-message err" role="alert">{t("project.loadError")}</p>;

  const isOwner = project.ownerId === user.uid;
  const who = (uid) => members.find((member) => member.uid === uid)?.displayName || t("task.unassigned");
  const taskRef = (taskId) => doc(db, "projects", id, "tasks", taskId);
  const canEdit = (task) => isOwner || task.createdBy === user.uid || task.assigneeId === user.uid;
  const canDelete = (task) => isOwner || task.createdBy === user.uid;
  const run = async (fn, fail) => {
    try { setMessage(""); await fn(); }
    catch { setMessage(fail); }
  };

  const saveTask = async (value) => {
    const data = { ...value, updatedAt: serverTimestamp() };
    if (editing === "new") {
      await addDoc(collection(db, "projects", id, "tasks"), {
        ...data, createdBy: user.uid, createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(taskRef(editing.id), data);
    }
    setEditing(null);
  };

  const setStatus = (task, status) => run(
    () => updateDoc(taskRef(task.id), { status, updatedAt: serverTimestamp() }),
    t("project.updateStatusError"),
  );

  const deleteTask = (task) => {
    if (!window.confirm(t("project.deleteTaskConfirm", { name: task.title }))) return;
    run(() => writeBatch(db).delete(taskRef(task.id)).commit(), t("project.deleteError"));
  };

  const addMember = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim().toLowerCase();
    run(async () => {
      const snapshot = await getDocs(query(collection(db, "users"), where("email", "==", email), limit(1)));
      if (snapshot.empty) throw new Error("User not found");
      const uid = snapshot.docs[0].id;
      if (project.memberIds.includes(uid)) {
        setMessage(t("project.alreadyMember"));
        return;
      }
      await updateDoc(doc(db, "projects", id), { memberIds: arrayUnion(uid), updatedAt: serverTimestamp() });
      form.reset();
      loadProject();
    }, t("project.memberError"));
  };

  const removeMember = (uid) => run(async () => {
    const batch = writeBatch(db);
    tasks.filter((task) => task.assigneeId === uid).forEach((task) =>
      batch.update(taskRef(task.id), { assigneeId: null, updatedAt: serverTimestamp() }));
    batch.update(doc(db, "projects", id), { memberIds: arrayRemove(uid), updatedAt: serverTimestamp() });
    await batch.commit();
    loadProject();
  }, t("project.removeMemberError"));

  const saveProject = async (event) => {
    event.preventDefault();
    const name = event.currentTarget.elements.name.value.trim();
    const description = event.currentTarget.elements.description.value.trim();
    if (name.length < 3 || name.length > 80 || description.length > 1000) {
      setMessage(t("project.validationError"));
      return;
    }
    setBusy(true);
    await run(async () => {
      await updateDoc(doc(db, "projects", id), { name, description, updatedAt: serverTimestamp() });
      await loadProject();
    }, t("project.saveError"));
    setBusy(false);
  };

  const deleteProject = () => {
    if (!window.confirm(t("project.deleteConfirm"))) return;
    run(async () => {
      const batch = writeBatch(db);
      tasks.forEach((task) => batch.delete(taskRef(task.id)));
      batch.delete(doc(db, "projects", id));
      await batch.commit();
      router.replace("/dashboard");
    }, t("project.deleteError"));
  };

  const completed = tasks.filter((task) => task.status === "done").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  return <>
    <Link className="back-link" href="/projects">← {t("project.back")}</Link>
    <div className="detail-header page-heading">
      <div><p className="eyebrow">{t("project.details")}</p><h1>{project.name}</h1><p>{project.description || t("common.noDescription")}</p></div>
      <button className="btn primary" onClick={() => setEditing("new")}><Icon name="plus" size={17} />{t("project.newTask")}</button>
    </div>
    <div className="card settings-section">
      <div className="progress-label"><span>{t("projects.progress")}</span><span>{completed}/{tasks.length} · {progress}%</span></div>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
    </div>
    {message && <p className="status-message err" role="alert">{message}</p>}
    {editing && <TaskForm key={editing.id || "new"} initial={editing === "new" ? undefined : editing} members={members} onSave={saveTask} onCancel={() => setEditing(null)} />}

    <div className="section-heading"><h2>{t("project.tasks")}</h2><span className="badge">{shown.length} / {tasks.length}</span></div>
    <div className="card toolbar" role="search">
      <label className="search-wrap"><Icon name="search" size={17} /><input placeholder={t("project.searchTasks")} aria-label={t("project.searchTasks")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
      <select aria-label={t("project.allStatuses")} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
        <option value="">{t("project.allStatuses")}</option>{Object.keys(STATUS).map((key) => <option key={key} value={key}>{t(`status.${key}`)}</option>)}
      </select>
      <select aria-label={t("project.allPriorities")} value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
        <option value="">{t("project.allPriorities")}</option>{Object.keys(PRIORITY).map((key) => <option key={key} value={key}>{t(`priority.${key}`)}</option>)}
      </select>
      <select aria-label={t("project.allAssignees")} value={filters.assignee} onChange={(event) => setFilters({ ...filters, assignee: event.target.value })}>
        <option value="">{t("project.allAssignees")}</option>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName || member.email}</option>)}
      </select>
    </div>
    {shown.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="tasks" /></span>
      <h3>{tasks.length ? t("project.noMatchingTasks") : t("project.noTasks")}</h3></div> :
      <div className="grid">{shown.map((task) => <article className="card task-card" key={task.id}>
        <h3>{task.title}</h3>{task.description && <p>{task.description}</p>}
        <div className="task-card-meta">
          <span className={`badge status-${task.status}`}>{t(`status.${task.status}`)}</span>
          <span className={`badge priority-${task.priority}`}>{t(`priority.${task.priority}`)}</span>
          {isOverdue(task) && <span className="badge warn">{t("common.overdue")}</span>}
        </div>
        <div className="task-card-meta"><span>{t("project.assignee")}: {who(task.assigneeId)}</span><span>{task.dueDate ? `${t("common.due")}: ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(language)}` : t("date.noDate")}</span></div>
        <div className="task-card-actions">
          <select aria-label={t("project.status")} value={task.status} disabled={!(isOwner || task.assigneeId === user.uid)} onChange={(event) => setStatus(task, event.target.value)}>
            {Object.keys(STATUS).map((key) => <option key={key} value={key}>{t(`status.${key}`)}</option>)}
          </select>
          {canEdit(task) && <button className="btn" onClick={() => setEditing(task)}>{t("common.edit")}</button>}
          {canDelete(task) && <button className="btn danger" onClick={() => deleteTask(task)}>{t("common.delete")}</button>}
        </div>
      </article>)}</div>}

    <div className="section-heading"><h2>{t("project.members")}</h2><span className="badge">{members.length}</span></div>
    <ul className="members-list">{members.map((member) => <li className="member-item" key={member.uid}>
      <span className="avatar">{(member.displayName || member.email || "?").charAt(0).toUpperCase()}</span>
      <span><strong>{member.displayName || member.email}</strong><br /><small className="muted">{member.email}</small></span>
      {member.uid === project.ownerId ? <span className="badge">{t("projects.owner")}</span> : isOwner && <button className="btn danger" onClick={() => removeMember(member.uid)}>{t("project.remove")}</button>}
    </li>)}</ul>

    {isOwner && <details className="card settings-section">
      <summary>{t("project.settings")} · {t("project.ownerOnly")}</summary>
      <form onSubmit={addMember} className="row">
        <label>{t("project.addMember")}<input name="email" type="email" required /></label>
        <button className="btn">{t("project.add")}</button>
      </form>
      <form onSubmit={saveProject} key={project.updatedAt?.seconds}>
        <label>{t("project.name")}<input name="name" defaultValue={project.name} maxLength={80} /></label>
        <label>{t("project.description")}<textarea name="description" rows="3" defaultValue={project.description} maxLength={1000} /></label>
        <div className="row"><button className="btn primary" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</button>
          <button type="button" className="btn danger" onClick={deleteProject}>{t("common.delete")}</button></div>
      </form>
    </details>}
  </>;
}
