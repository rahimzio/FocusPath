"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { signIn } from "next-auth/react";

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [userName, setuserName] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("authEmail");
    const savedPassword = localStorage.getItem("authPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setuserName(userName);
      setRememberMe(true);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Bitte gib eine gültige E-Mail-Adresse ein.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, userName }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.message === "Benutzer existiert bereits.") {
          toast.info("Benutzer existiert bereits. Bitte logge dich ein.");
          setTimeout(() => {
            router.push("/login");
          }, 2000); // 2 Sekunden warten vor dem Redirect
          return;
        }
        throw new Error(data.message || "Registrierung fehlgeschlagen");
      }
      console.log("✅ Registrierung erfolgreich", email);
      toast.success("Registrierung erfolgreich!");

      if (rememberMe) {
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authPassword", password);
      } else {
        localStorage.removeItem("authEmail");
        localStorage.removeItem("authPassword");
      }

      // Automatisch einloggen
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/",
      });

      if (!signInResult?.ok) {
        console.warn("❌ Auto-Login nach Registrierung fehlgeschlagen", signInResult?.error);
        toast.warn("Registriert, aber Login fehlgeschlagen. Bitte manuell einloggen.");
        router.push("/login");
      }
    } catch (err: any) {
      console.error("❌ Fehler bei der Registrierung", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleRegister}
        className="bg-white rounded-2xl shadow-xl p-8 space-y-6 w-full max-w-sm border border-gray-200"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Registrieren</h2>
        <h2 className="text-2xl font-bold text-gray-800 text-center">Account erstellen</h2>
        <p className="text-center text-gray-500 text-sm">Registriere dich, um fortzufahren</p>

        <div className="space-y-3 text-black">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="text"
            placeholder="Benutzername"
            value={userName}
            onChange={(e) => setuserName(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <label className="flex items-center gap-2 text-gray-600 text-sm">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-blue-500"
          />
          Angemeldet bleiben
        </label>

        <button
          type="submit"
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳ Registriere..." : "Registrieren"}
        </button>
      </form>
      <div className="text-center text-sm text-gray-600 mt-2">
        Bereits Mitglied?{' '}
        <a href="/login/login" className="text-blue-600 hover:underline">
          Zum Login
        </a>
      </div>
    </div>
  );
}
