'use client'
import React, { useEffect, useState } from "react";
import { AffirmationEntry } from "@/utils/interface";
import { toast } from "react-toastify";

interface Props { userId?: string; }

const emptyAffirmation: AffirmationEntry = {
  sentence: "",
  emotion: "",
  createdAt: new Date(),
  active: true,
};

const AffirmationAnchor: React.FC<Props> = ({ userId }) => {
  const [affirmations, setAffirmations] = useState<AffirmationEntry[]>([]);
  const [form, setForm] = useState<AffirmationEntry>(emptyAffirmation);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function fetchAffirmations() {
      try {
        const res = await fetch(`/api/affirmation/list?userId=${encodeURIComponent(userId ?? "")}`);
        const data = await res.json();
        setAffirmations(Array.isArray(data.affirmations) ? data.affirmations : []);
      } catch (err) {
        console.error(err);
      }
    }
    if (userId) fetchAffirmations();
  }, [userId]);

  async function saveAffirmation() {
    if (!form.sentence.trim()) { toast.info("Bitte Satz eingeben."); return; }
    setBusy(true);
    try {
      const payload = { ...form, userId, createdAt: new Date().toISOString() };
      // optimistic
      const tempId = `tmp_${Date.now()}`;
      setAffirmations(prev => [{ ...payload, _id: tempId } as any, ...prev]);

      const res = await fetch("/api/affirmation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json().catch(()=> null);

      setAffirmations(prev => prev.map(a => a._id === tempId ? (saved?.affirmation ?? a) : a));
      setForm({ ...emptyAffirmation, createdAt: new Date() });
      toast.success("Affirmation gespeichert.");
    } catch (err:any) {
      console.error(err);
      toast.error("Speichern fehlgeschlagen.");
      // rollback
      setAffirmations(prev => prev.filter(a => !String(a._id).startsWith('tmp_')));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAffirmation(index: number) {
    const toDelete = affirmations[index];
    if (!toDelete?._id) return;
    // optimistic
    const prev = affirmations;
    setAffirmations(prev.filter((_, i) => i !== index));
    try {
      const res = await fetch(`/api/affirmation/delete?id=${encodeURIComponent(String(toDelete._id))}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error(err);
      toast.error("Löschen fehlgeschlagen.");
      setAffirmations(prev); // rollback
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-2xl font-semibold">Affirmation Anchor</h2>

      <div className="space-y-2">
        <input type="text" className="w-full border p-2 rounded" placeholder="Dein Satz"
          value={form.sentence} onChange={(e) => setForm({ ...form, sentence: e.target.value })} />
        <input type="text" className="w-full border p-2 rounded" placeholder="Gefühl"
          value={form.emotion} onChange={(e) => setForm({ ...form, emotion: e.target.value })} />
        <input type="text" className="w-full border p-2 rounded" placeholder="Kontext (optional)"
          value={form.context || ""} onChange={(e) => setForm({ ...form, context: e.target.value })} />
        <button onClick={saveAffirmation} disabled={busy}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60">
          {busy ? "Speichere…" : "Speichern"}
        </button>
      </div>

      {affirmations.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Gespeicherte Affirmationen</h3>
          <ul className="space-y-2">
            {affirmations.map((a, idx) => (
              <li key={a._id ?? idx} className="flex justify-between items-center border p-2 rounded">
                <span className="truncate">
                  {a.sentence} – <span className="text-sm text-gray-500">{a.emotion}</span>
                </span>
                <button onClick={() => deleteAffirmation(idx)} className="text-red-500 hover:underline">
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AffirmationAnchor;
