// components/FrequencyReflection.tsx
import React, { useState } from "react";

interface FrequencyReflectionProps {
  userId: string;
  date: string; // YYYY-MM-DD
  timeOfDay: "morning" | "evening";
  onSave?: () => void;
}

const FrequencyReflection: React.FC<FrequencyReflectionProps> = ({ userId, date, timeOfDay, onSave }) => {
  const [reflection, setReflection] = useState("");
  const [influence, setInfluence] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      userId,
      date,
      timeOfDay,
      reflection,
      influence,
    };

    try {
      const response = await fetch("/api/frequencyReflection/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = response.headers.get("content-type") || "";
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status} – ${text.slice(0, 120)}`);
      }
      if (!ct.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0, 120)}`);
      }
      const _data = await response.json();


      if (!response.ok) {
        throw new Error("Fehler beim Speichern");
      }

      if (onSave) onSave();
      alert("Reflexion gespeichert! 🙏");
      setReflection("");
      setInfluence("");

    } catch (error) {
      console.error(error);
      alert("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-semibold mb-4">Tagesreflexion</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Wie fühlst du dich heute in einem Satz?
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Was hat deine Frequenz heute am stärksten beeinflusst?
          </label>
          <textarea
            value={influence}
            onChange={(e) => setInfluence(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={saving}
        >
          {saving ? "Speichern..." : "Reflexion speichern"}
        </button>
      </form>
    </div>
  );
};

export default FrequencyReflection;
