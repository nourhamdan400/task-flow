"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";

export default function NewProject() {
  const { user } = useRequireAuth();
  const { t } = usePreferences();
  const router = useRouter();
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.elements.name.value.trim();
    const description = form.elements.description.value.trim();
    const errors = {};
    if (name.length < 3 || name.length > 80) errors.name = t("project.nameError");
    if (description.length > 1000) errors.description = t("project.descriptionError");
    setErr(errors);
    if (Object.keys(errors).length || !user) return;
    setBusy(true);
    try {
      const project = await addDoc(collection(db, "projects"), {
        name, description, ownerId: user.uid, memberIds: [user.uid], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      router.push(`/projects/${project.id}`);
    } catch {
      setErr({ form: t("project.createError") });
      setBusy(false);
    }
  };

  return <form className="card narrow form-card" onSubmit={submit} noValidate>
    <Link className="back-link" href="/projects">← {t("projects.title")}</Link>
    <h1>{t("project.new")}</h1><p className="form-intro">{t("projects.subtitle")}</p>
    <label>{t("project.name")}<input name="name" maxLength={80} required />{err.name && <span className="err">{err.name}</span>}</label>
    <label>{t("project.description")} <span className="muted">({t("project.optional")})</span><textarea name="description" rows="4" maxLength={1000} />{err.description && <span className="err">{err.description}</span>}</label>
    {err.form && <p className="err" role="alert">{err.form}</p>}
    <div className="task-form-actions"><button className="btn primary" disabled={busy}>{busy ? t("common.saving") : t("project.createAction")}</button>
      <Link className="btn" href="/projects">{t("common.cancel")}</Link></div>
  </form>;
}
