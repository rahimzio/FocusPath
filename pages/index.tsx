"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import DailyTaskList from "@/components/dailyTodos";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const [localLoading, setLocalLoading] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (session) {
      setLocalLoading(false);
      return;
    }

    const email = localStorage.getItem("email");
    const password = localStorage.getItem("password");

    if (email && password && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      signIn("credentials", {
        email,
        password,
        redirect: false,
      }).then((res) => {
        setLocalLoading(false);
      });
    } else {
      setLocalLoading(false);
    }
  }, [session, status, autoLoginAttempted]);

  if (status === "loading" || localLoading) {
    return <div className="p-8 text-gray-600 text-center">⏳ Lade FokusPath…</div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center">
        <h1 className="text-2xl font-semibold text-gray-800">Willkommen bei FokusPath</h1>
        <p className="text-gray-600">Bitte logge dich ein, um deine Aufgaben zu sehen.</p>
        <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          🔐 Zur Login-Seite
        </Link>
      </div>
    );
  }

  return <DailyTaskList />;
}
