// components/FrequencyReflection.tsx
import React, { useState } from "react";
import { toast } from "react-toastify";

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
      type: "frequency_reflection",
    };

    try {
      const response = await fetch("/api/frequencyReflection/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const ct = response.headers.get("content-type") || "";
      const isJson = ct.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok || (isJson && data?.ok === false)) {
        const msg = (isJson ? data?.error : data) || `HTTP ${response.status}`;
        throw new Error(String(msg));
      }

      onSave?.();
      setReflection("");
      setInfluence("");

      try {
        toast.success("Reflexion gespeichert! 🙏");
      } catch {
        alert("Reflexion gespeichert! 🙏");
      }
    } catch (error) {
      console.error(error);
      try {
        toast.error("Speichern fehlgeschlagen");
      } catch {
        alert("Speichern fehlgeschlagen");
      }
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
            placeholder="z. B. ruhig und fokussiert – habe meine DOs gut geschafft."
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
            placeholder="z. B. Handy weggelegt + 2× Deep-Work-Blöcke → klarer Kopf"
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
