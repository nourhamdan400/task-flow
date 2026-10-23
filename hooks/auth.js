"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

const Ctx = createContext({ user: null, loading: true });
export function AuthProvider({ children }) {
  const [s, setS] = useState({ user: null, loading: true });
  useEffect(() => onAuthStateChanged(auth, (user) => setS({ user, loading: false })), []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export function useRequireAuth() {
  const a = useAuth();
  const router = useRouter();
  useEffect(() => { if (!a.loading && !a.user) router.replace("/login"); }, [a, router]);
  return a;
}
