"use client";

import { useEffect, useState } from "react";
import DailyTaskList from "@/components/dailyTodos";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function Home() {
  const { data: session, status } = useSession();
  const [localLoading, setLocalLoading] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    // Session vorhanden → nichts tun
    if (session) {
      setLocalLoading(false);
      return;
    }

    // Falls localStorage-Daten vorhanden → Auto-Login versuchen
    const email = localStorage.getItem("email");
    const password = localStorage.getItem("password");

    if (email && password && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      signIn("credentials", {
        email,
        password,
        redirect: false,
      }).then((res) => {
        if (!res?.error) {
          setLocalLoading(false);
        } else {
          console.warn("Auto-Login fehlgeschlagen");
          setLocalLoading(false);
        }
      });
    } else {
      setLocalLoading(false);
    }
  }, [session, status, autoLoginAttempted]);

  if (status === "loading" || localLoading) {
    return <div className="p-4 text-gray-700">⏳ Lade...</div>;
  }

  return (
    
      <DailyTaskList />
  );
}
