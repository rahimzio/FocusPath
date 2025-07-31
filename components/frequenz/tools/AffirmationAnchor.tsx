import React, { useEffect, useState } from "react";
import { AffirmationEntry } from "@/utils/frequenz/frequencyModels";

interface Props {
  userId?: string;
}

const emptyAffirmation: AffirmationEntry = {
  sentence: "",
  emotion: "",
  createdAt: new Date(),
  active: true,
};

const AffirmationAnchor: React.FC<Props> = ({ userId }) => {
  const [affirmations, setAffirmations] = useState<AffirmationEntry[]>([]);
  const [form, setForm] = useState<AffirmationEntry>(emptyAffirmation);

  useEffect(() => {
    async function fetchAffirmations() {
      try {
        const res = await fetch(`/api/affirmation/list?userId=${userId ?? ""}`);
        const data = await res.json();
        setAffirmations(data.affirmations || []);
      } catch (err) {
        console.error(err);
      }
    }
    fetchAffirmations();
  }, [userId]);

  async function saveAffirmation() {
    try {
      await fetch("/api/affirmation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ ...emptyAffirmation, createdAt: new Date() });
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteAffirmation(index: number) {
    const toDelete = affirmations[index];
    try {
      await fetch(`/api/affirmation/delete?id=${toDelete._id}`);
      setAffirmations((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-2xl font-semibold">Affirmation Anchor</h2>

      <div className="space-y-2">
        <input
          type="text"
          className="w-full border p-2 rounded"
          placeholder="Dein Satz"
          value={form.sentence}
          onChange={(e) => setForm({ ...form, sentence: e.target.value })}
        />
        <input
          type="text"
          className="w-full border p-2 rounded"
          placeholder="Gefühl"
          value={form.emotion}
          onChange={(e) => setForm({ ...form, emotion: e.target.value })}
        />
        <input
          type="text"
          className="w-full border p-2 rounded"
          placeholder="Kontext (optional)"
          value={form.context || ""}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
        />
        <button
          onClick={saveAffirmation}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Speichern
        </button>
      </div>

      {affirmations.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Gespeicherte Affirmationen</h3>
          <ul className="space-y-2">
            {affirmations.map((a, idx) => (
              <li key={idx} className="flex justify-between items-center border p-2 rounded">
                <span>
                  {a.sentence} – <span className="text-sm text-gray-500">{a.emotion}</span>
                </span>
                <button
                  onClick={() => deleteAffirmation(idx)}
                  className="text-red-500 hover:underline"
                >
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