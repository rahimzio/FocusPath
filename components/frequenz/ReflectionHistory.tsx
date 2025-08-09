// components/ReflectionHistory.tsx
import React, { useEffect, useState } from "react";

interface Reflection {
  _id: string;
  date: string;
  timeOfDay: "morning" | "evening";
  reflection: string;
  influence: string;
  createdAt: string;
}

interface ReflectionHistoryProps {
  userId: string;
}

const ReflectionHistory: React.FC<ReflectionHistoryProps> = ({ userId }) => {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
async function fetchReflections() {
  try {
    const res = await fetch(`/api/frequencyReflection/getAll?userId=${userId}`);
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} – ${text.slice(0,120)}`);
    }
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0,120)}`);
    }
    const data = await res.json();
    setReflections(data.reflections || []);
  } catch (err) {
    console.error("Fehler beim Laden der Reflexionen:", err);
    setReflections([]); // robustes Fallback
  } finally {
    setLoading(false);
  }
}

    fetchReflections();
  }, [userId]);

  if (loading) return <p>Lade deine Reflexionen...</p>;

  if (reflections.length === 0) return <p>Keine Reflexionen gefunden.</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-semibold mb-4">Deine gespeicherten Reflexionen</h2>
      <ul className="space-y-6">
        {reflections.map((entry) => (
          <li key={entry._id} className="border p-4 rounded bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">
              {entry.date} – {entry.timeOfDay === "morning" ? "🕊️ Morgen" : "🌙 Abend"}
            </p>
            <p className="font-medium mb-1">💬 „{entry.reflection}“</p>
            <p className="text-sm text-gray-600 italic">
              Einfluss: {entry.influence}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReflectionHistory;
