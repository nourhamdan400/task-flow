"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createUserWithEmailAndPassword,
  GithubAuthProvider,
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import Icon from "@/components/Icon";

export default function AuthForm({ mode }) {
  const reg = mode === "register";
  const router = useRouter();
  const { user } = useAuth();
  const { t } = usePreferences();
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

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
        const c = await createUserWithEmailAndPassword(
          auth,
          d.email,
          d.password,
        );
        await updateProfile(c.user, { displayName: d.name.trim() });
        await setDoc(doc(db, "users", c.user.uid), {
          displayName: d.name.trim(),
          email: d.email.trim().toLowerCase(),
          createdAt: serverTimestamp(),
        });
      } else {
        const persistence =
          d.remember === "on"
            ? browserLocalPersistence
            : browserSessionPersistence;
        await setPersistence(auth, persistence);
        await signInWithEmailAndPassword(auth, d.email, d.password);
      }
      router.replace("/dashboard");
    } catch (x) {
      setErr(
        x.code === "auth/email-already-in-use"
          ? t("auth.emailExists")
          : x.code === "auth/weak-password"
            ? t("auth.weakPassword")
            : t("auth.failed"),
      );
      setBusy(false);
    }
  };

  const signInWithProvider = async (providerName) => {
    setErr("");
    setNotice("");
    setBusy(true);
    try {
      const provider =
        providerName === "google"
          ? new GoogleAuthProvider()
          : new GithubAuthProvider();
      if (providerName === "github") provider.addScope("user:email");
      const credential = await signInWithPopup(auth, provider);
      const profile = credential.user;
      await setDoc(
        doc(db, "users", profile.uid),
        {
          displayName: profile.displayName || profile.email || "",
          email: profile.email || "",
          photoURL: profile.photoURL || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      router.replace("/dashboard");
    } catch (providerError) {
      setErr(
        providerError.code === "auth/account-exists-with-different-credential"
          ? t("auth.accountExists")
          : t("auth.failed"),
      );
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    const email = document.getElementById("auth-email")?.value.trim();
    setErr("");
    setNotice("");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErr(t("auth.emailError"));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setNotice(t("auth.resetSent"));
    } catch {
      setErr(t("auth.resetFailed"));
    }
  };

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-layout">
        <aside className="auth-story">
          <Link className="auth-story-brand" href="/login">
            <span className="tf-brand-mark">
              <Icon name="check" size={17} />
            </span>
            <span>TaskFlow</span>
          </Link>
          <div className="auth-story-copy">
            <h1>
              {t("auth.organize")}
              <br />
              {t("auth.work")} <span>{t("auth.build")}</span>
              <br />
              <span>{t("auth.together")}</span>
            </h1>
            <p>{t("auth.featureCopy")}</p>
          </div>
          <div className="auth-story-art" aria-hidden="true">
            <div className="auth-art-board">
              {[0, 1, 2].map((item) => (
                <div className="auth-art-row" key={item}>
                  <span className="auth-art-check">
                    <Icon name="check" size={10} />
                  </span>
                  <span />
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="auth-form-panel">
          <form onSubmit={submit} noValidate>
            <h2 id="auth-title">
              {reg ? t("auth.register") : t("auth.welcomeBack")}
            </h2>
            <p className="auth-form-caption">
              {reg ? t("auth.tagline") : t("auth.signInCaption")}
            </p>
            {reg && (
              <label htmlFor="auth-name">
                {t("auth.name")}
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(err)}
                  aria-describedby={err ? "auth-error" : undefined}
                />
              </label>
            )}
            <label htmlFor="auth-email">
              {t("auth.emailAddress")}
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                aria-invalid={Boolean(err)}
                aria-describedby={err ? "auth-error" : undefined}
              />
            </label>
            <label htmlFor="auth-password">
              {t("auth.password")}
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={reg ? "new-password" : "current-password"}
                placeholder="••••••••"
                required
                aria-invalid={Boolean(err)}
                aria-describedby={err ? "auth-error" : undefined}
              />
            </label>
            {!reg && (
              <div className="auth-options">
                <label>
                  <input type="checkbox" name="remember" />
                  {t("auth.remember")}
                </label>
                <button
                  type="button"
                  className="auth-text-button"
                  onClick={resetPassword}
                >
                  {t("auth.forgot")}
                </button>
              </div>
            )}
            {err && (
              <p id="auth-error" className="auth-error" role="alert">
                {err}
              </p>
            )}
            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}
            <button
              className="btn primary auth-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                t("auth.wait")
              ) : reg ? (
                t("auth.register")
              ) : (
                <>
                  {t("auth.login")} <Icon name="arrow" size={15} />
                </>
              )}
            </button>
            <div className="auth-divider">{t("auth.orContinue")}</div>
            <div className="auth-socials">
              <button
                className="auth-social"
                type="button"
                onClick={() => signInWithProvider("google")}
                disabled={busy}
              >
                <span className="google-mark">G</span>Google
              </button>
              <button
                className="auth-social"
                type="button"
                onClick={() => signInWithProvider("github")}
                disabled={busy}
              >
                <Icon name="github" size={15} />
                GitHub
              </button>
            </div>
            <p className="auth-footer">
              {reg ? t("auth.alreadyPrefix") : t("auth.newPrefix")}{" "}
              {reg ? (
                <Link href="/login">{t("auth.login")}</Link>
              ) : (
                <Link href="/register">{t("auth.register")}</Link>
              )}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
