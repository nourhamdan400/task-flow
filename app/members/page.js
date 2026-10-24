"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useRequireAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";
import { db } from "@/lib/firebase";
import { getWorkspaceProjects } from "@/lib/workspace";

export default function MembersPage() {
  const { user } = useRequireAuth();
  const { t } = usePreferences();
  const [members, setMembers] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    getWorkspaceProjects(user.uid)
      .then(async (projects) => {
        const projectCounts = new Map();
        projects.forEach((project) =>
          (project.memberIds || []).forEach((uid) => {
            projectCounts.set(uid, (projectCounts.get(uid) || 0) + 1);
          }),
        );
        const profiles = await Promise.allSettled(
          [...projectCounts.keys()].map((uid) => getDoc(doc(db, "users", uid))),
        );
        if (!active) return;
        setMembers(
          profiles
            .filter(
              (profile) =>
                profile.status === "fulfilled" && profile.value.exists(),
            )
            .map((profile) => ({
              uid: profile.value.id,
              ...profile.value.data(),
              projectCount: projectCounts.get(profile.value.id),
            }))
            .sort((first, second) =>
              (first.displayName || first.email || "").localeCompare(
                second.displayName || second.email || "",
              ),
            ),
        );
      })
      .catch(() => {
        if (active) setError(t("common.error"));
      });
    return () => {
      active = false;
    };
  }, [user, t]);

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("nav.workspace")}</p>
          <h1>{t("members.title")}</h1>
          <p>{t("members.subtitle")}</p>
        </div>
      </div>
      {error ? (
        <p className="status-message err" role="alert">
          {error}
        </p>
      ) : members === null ? (
        <p className="status-message muted" role="status">
          {t("common.loading")}
        </p>
      ) : members.length === 0 ? (
        <div className="empty-state">
          <h3>{t("members.empty")}</h3>
        </div>
      ) : (
        <div className="members-grid">
          {members.map((member) => (
            <article className="member-directory-card" key={member.uid}>
              <span className="member-avatar">
                {member.photoURL ? (
                  <img src={member.photoURL} alt="" />
                ) : (
                  (member.displayName || member.email || "?")
                    .charAt(0)
                    .toUpperCase()
                )}
              </span>
              <span>
                <strong>{member.displayName || member.email}</strong>
                <small>
                  {member.email} · {member.projectCount} {t("members.projects")}
                </small>
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
