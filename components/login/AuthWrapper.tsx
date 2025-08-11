"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { UserMe } from "@/utils/interface";
interface Props {
  children: React.ReactNode;
}

export const AuthWrapper = ({ children }: Props) => {
  const { data: session, status } = useSession();
  const [localLoading, setLocalLoading] = useState(true);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const router = useRouter();

  const publicPaths = [
    "/login",
    "/login/login",
    "/login/register",
    "/login/forgot-password",
  ];
  const isPublicPath = publicPaths.includes(router.pathname);

  useEffect(() => {
    if (status === "loading") return;

    if (session || isPublicPath) {
      setLocalLoading(false);
      return;
    }
    const email = localStorage.getItem("authEmail");
    const password = localStorage.getItem("authPassword");
    
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
  }, [session, status, autoLoginAttempted, isPublicPath]);

useEffect(() => {
    if (!session?.user?.id || isPublicPath || router.pathname === "/onboarding") {
      setOnboardingChecked(true);
      return;
    }
    fetch(`/api/user/me?userId=${session.user.id}`)
      .then(res => res.json())
      .then((data: UserMe) => {
        if (!data.onboardingCompleted) router.replace("/overview/onboarding");
      })
      .catch(() => toast.error("Konnte Benutzerstatus nicht prüfen"))
      .finally(() => setOnboardingChecked(true));
  }, [session, isPublicPath, router.pathname]);

  if (status === "loading" || localLoading || (!onboardingChecked && !isPublicPath)) {
    return <div className="p-4 text-gray-700">⏳ Lade...</div>;
  }

  if (!session && !isPublicPath) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-6 w-full">
        <h1 className="text-2xl font-semibold mb-4">Du bist nicht eingeloggt</h1>
        <p className="mb-6 text-gray-600">Bitte melde dich an oder registriere dich, um deine Aufgaben zu sehen.</p>
        <div className="flex gap-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded shadow"
            onClick={() => router.push("/login/login")}
          >
            🔐 Login
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded shadow"
            onClick={() => router.push("/login/register")}
          >
            ✍️ Registrieren
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
