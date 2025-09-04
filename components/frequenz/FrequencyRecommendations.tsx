// FrequencyRecommendations.tsx
import React from "react";
import { toast } from "react-toastify";

type FrequencyRecommendation = {
  title: string;
  description: string;
  category: "Mindset" | "Körper" | "Emotion" | "Verhalten";
  gapReason: string;
  basedOn: string;
};

interface FrequencyRecommendationsProps {
  recommendations: FrequencyRecommendation[];
  userId: string; // Nutzer-ID für die Aufgaben-Zuordnung
  onTaskCreated?: () => void; // Optional: Callback nach Task-Erstellung
}

export const FrequencyRecommendations: React.FC<FrequencyRecommendationsProps> = ({
  recommendations,
  userId,
  onTaskCreated,
}) => {
  async function createTaskFromRecommendation(rec: FrequencyRecommendation, isDont = false) {
    try {
      // Mappe eine Empfehlung auf unser Task-Schema
      const task = {
        name: rec.title,
        points: 1, // bewusst klein halten (Einfluss kommt über Smoothing)
        isDont,
        frequency: "daily" as const,
        timebased: false,
        category: "Frequenz",
        isFrequencyTask: true,
        meta: {
          description: rec.description,
          category: rec.category,
          gapReason: rec.gapReason,
          basedOn: rec.basedOn,
          source: "recommendation",
        },
      };

      const r = await fetch("/api/frequency/bulkCreateDaily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tasks: [task] }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        const err = j?.error || `HTTP ${r.status}`;
        throw new Error(err);
      }

      toast.success(`Aufgabe übernommen: ${rec.title}`);
      onTaskCreated?.();
    } catch (e: any) {
      console.error(e);
      toast.error("Fehler beim Erstellen der Frequenz-Aufgabe");
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Deine Empfehlungen für heute</h2>
      {recommendations.length === 0 ? (
        <p className="text-gray-500">Keine besonderen Empfehlungen – du bist nah an deinem Ideal! 🌟</p>
      ) : (
        recommendations.map((rec, idx) => (
          <div key={idx} className="border rounded-md p-4 bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-green-700">{rec.title}</h3>
                <p className="mt-1 text-gray-700">{rec.description}</p>
                <p className="text-sm italic text-gray-500 mt-2">
                  Grund: {rec.gapReason} · Basis: {rec.basedOn} · Bereich: {rec.category}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => createTaskFromRecommendation(rec, false)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Als DO übernehmen
              </button>
              <button
                onClick={() => createTaskFromRecommendation(rec, true)}
                className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700"
              >
                Als DON’T vormerken
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default FrequencyRecommendations;
