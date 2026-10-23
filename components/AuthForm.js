"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";

export default function AuthForm({ mode }) {
  const reg = mode === "register";
  const router = useRouter();
  const { user } = useAuth();
  const { t } = usePreferences();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace("/dashboard"); }, [user, router]);

  const submit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    setErr("");
    if (reg && d.name.trim().length < 2) return setErr(t("auth.nameError"));
    if (!/^\S+@\S+\.\S+$/.test(d.email)) return setErr(t("auth.emailError"));
    if (d.password.length < 6) return setErr(t("auth.passwordError"));
    setBusy(true);
    try {
      if (reg) {
        const c = await createUserWithEmailAndPassword(auth, d.email, d.password);
        await updateProfile(c.user, { displayName: d.name.trim() });
        await setDoc(doc(db, "users", c.user.uid), {
          displayName: d.name.trim(), email: d.email.trim().toLowerCase(), createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, d.email, d.password);
      }
      router.replace("/dashboard");
    } catch (x) {
      setErr(x.code === "auth/email-already-in-use" ? t("auth.emailExists")
        : x.code === "auth/weak-password" ? t("auth.weakPassword") : t("auth.failed"));
      setBusy(false);
    }
  };

  return (
    <form className="card narrow form-card" onSubmit={submit} noValidate>
      <p className="eyebrow">TaskFlow</p>
      <h1>{reg ? t("auth.register") : t("auth.login")}</h1>
      <p className="form-intro">{t("auth.tagline")}</p>
      {reg && <label>{t("auth.name")}<input name="name" autoComplete="name" /></label>}
      <label>{t("auth.email")}<input name="email" type="email" autoComplete="email" /></label>
      <label>{t("auth.password")}<input name="password" type="password" autoComplete={reg ? "new-password" : "current-password"} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn primary" disabled={busy}>{busy ? t("auth.wait") : reg ? t("auth.register") : t("auth.login")}</button>
      <p>{reg ? <Link href="/login">{t("auth.already")}</Link> : <Link href="/register">{t("auth.new")}</Link>}</p>
    </form>
  );
}
