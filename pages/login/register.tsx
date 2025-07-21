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
        body: JSON.stringify({ email, password,userName  }),
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
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow bg-white text-black">
      <h2 className="text-xl font-bold mb-4">Registrieren</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
         <input
          type="UserName"
          placeholder="Benutzer Name"
          value={userName}
          onChange={(e) => setuserName(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Angemeldet bleiben
        </label>

        <button
          type="submit"
          className="w-full p-2 bg-green-500 text-white rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "⏳ Registriere..." : "Registrieren"}
        </button>
      </form>
    </div>
  );
}
