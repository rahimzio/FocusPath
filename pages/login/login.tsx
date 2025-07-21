"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("authEmail");
    const savedPassword = localStorage.getItem("authPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
      toast.info("Automatisch vorausgefüllt");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.ok) {
       console.log("✅ Login erfolgreich", email);
      if (rememberMe) {
        localStorage.setItem("authEmail", email);
        localStorage.setItem("authPassword", password);
      } else {
        localStorage.removeItem("authEmail");
        localStorage.removeItem("authPassword");
      }
      toast.success("Login erfolgreich!");
      router.push("/");
    } else {
       console.warn("❌ Login fehlgeschlagen", result?.error);
      toast.error("Login fehlgeschlagen. Bitte überprüfe deine Eingaben.");
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 space-y-6 w-full max-w-sm border border-gray-200"
      >
        <h2 className="text-2xl font-bold text-gray-800 text-center">Willkommen zurück 👋</h2>
        <p className="text-center text-gray-500 text-sm">Melde dich an, um fortzufahren</p>

        <div className="space-y-3 text-black">
          <input
            type="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 text-black py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 text-black py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-blue-500"
            />
            Angemeldet bleiben
          </label>
          <a href="#" className="text-blue-500 hover:underline">Passwort vergessen?</a>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Wird geprüft..." : "Einloggen"}
        </button>

        <div className="text-center text-sm text-gray-600 mt-2">
          Noch kein Account?{" "}
          <a href="/login/register" className="text-blue-600 hover:underline">
            Jetzt registrieren
          </a>
        </div>
      </form>
    </div>
  );
}
