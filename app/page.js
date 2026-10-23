"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth";
import { usePreferences } from "@/hooks/preferences";

export default function Home() {
  const { user, loading } = useAuth();
  const { t } = usePreferences();
  const router = useRouter();
  useEffect(() => { if (!loading) router.replace(user ? "/dashboard" : "/login"); }, [user, loading, router]);
  return <p className="status-message muted" role="status">{t("common.loading")}</p>;
}
