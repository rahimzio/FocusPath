"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function NotLoggedInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const localEmail = localStorage.getItem("authEmail");
    const localPassword = localStorage.getItem("authPassword");

    if (status === "loading") return;

    // Wenn kein Session-Token vorhanden ist UND nichts im localStorage gespeichert
    if (!session && (!localEmail || !localPassword)) {
      setShowWarning(true);
    } else if (session) {
      // Wenn angemeldet → Weiterleitung zur Startseite
      router.push("/");
    }
  }, [session, status, router]);

  if (!showWarning) return null;

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Anscheinend bist du nicht angemeldet</h1>
      <p className="text-gray-600 mb-6">Bitte melde dich an oder registriere dich, um fortzufahren.</p>
      <div className="flex gap-4">
        <button
          onClick={() => router.push("/login")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Zur Anmeldung
        </button>
        <button
          onClick={() => router.push("/register")}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Registrieren
        </button>
      </div>
    </div>
  );
}
