"use client";
import { useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

export default function ForgotPassword() {
  const router = useRouter();
   const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/resetByBirthdate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, birthDate, newPassword: password }),
    });
    setLoading(false);
    if (res.ok) {
toast.success("Passwort aktualisiert");
      router.push("/login/login");    } else {
      const data = await res.json();
      toast.error(data.message || "Fehler beim Senden");
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-6 w-full max-w-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Passwort vergessen</h2>
        <p className="text-center text-gray-500 text-sm">Bestätige dein Geburtsdatum um dein Passwort zu ändern.</p>
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <input
          type="date"
          placeholder="Geburtsdatum"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <input
          type="password"
          placeholder="Neues Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition disabled:opacity-50" disabled={loading}>
{loading ? "Aktualisiere..." : "Passwort zurücksetzen"}        </button>
      </form>
    </div>
  );
}