"use client";

import { useState } from "react";
import { STATUS, PRIORITY } from "@/lib/utils";
import { usePreferences } from "@/hooks/preferences";

export default function TaskForm({ initial, members, onSave, onCancel }) {
  const { t } = usePreferences();
  const [v, setV] = useState({ title: "", description: "", status: "todo", priority: "medium", dueDate: "", assigneeId: "", ...initial });
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const title = v.title.trim(), errors = {};
    if (title.length < 3 || title.length > 120) errors.title = t("task.titleError");
    if ((v.description || "").length > 1000) errors.description = t("task.descriptionError");
    setErr(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await onSave({
        title, description: (v.description || "").trim(), status: v.status, priority: v.priority,
        dueDate: v.dueDate || null, assigneeId: v.assigneeId || null,
      });
    } catch {
      setErr({ form: t("task.saveError") });
      setBusy(false);
    }
  };

  return (
    <form className="card task-form" onSubmit={submit} noValidate>
      <h2>{initial ? t("task.edit") : t("task.new")}</h2>
      <div className="form-grid">
        <label>{t("task.title")}<input value={v.title} onChange={set("title")} maxLength={120} />{err.title && <span className="err">{err.title}</span>}</label>
        <label>{t("project.status")}<select value={v.status} onChange={set("status")}>{Object.keys(STATUS).map((key) => <option key={key} value={key}>{t(`status.${key}`)}</option>)}</select></label>
        <label>{t("task.description")}<textarea rows="3" value={v.description || ""} onChange={set("description")} maxLength={1000} />{err.description && <span className="err">{err.description}</span>}</label>
        <label>{t("project.priority")}<select value={v.priority} onChange={set("priority")}>{Object.keys(PRIORITY).map((key) => <option key={key} value={key}>{t(`priority.${key}`)}</option>)}</select></label>
        <label>{t("project.dueDate")}<input type="date" value={v.dueDate || ""} onChange={set("dueDate")} /></label>
        <label>{t("project.assignee")}<select value={v.assigneeId || ""} onChange={set("assigneeId")}><option value="">{t("task.unassigned")}</option>{members.map((member) => <option key={member.uid} value={member.uid}>{member.displayName || member.email}</option>)}</select></label>
      </div>
      {err.form && <p className="err" role="alert">{err.form}</p>}
      <div className="task-form-actions"><button className="btn primary" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</button><button type="button" className="btn" onClick={onCancel}>{t("common.cancel")}</button></div>
    </form>
  );
}
