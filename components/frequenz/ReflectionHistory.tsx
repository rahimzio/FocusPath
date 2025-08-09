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
        const res = await fetch(`/api/frequency/getReflection?userId=${userId}`);
        const ct = res.headers.get("content-type") || "";
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status} – ${text.slice(0, 120)}`);
        }
        if (!ct.includes("application/json")) {
          const text = await res.text();
          throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0, 120)}`);
        }
        const data = await res.json();
        setReflections(data.reflections || []);
      } catch (err) {
        console.error("Fehler beim Laden der Reflexionen:", err);
        setReflections([]);
      } finally {
        setLoading(false);
      }
    }
    fetchReflections();
  }, [userId]);

  if (loading) return <p className="text-sm sm:text-base">Lade deine Reflexionen...</p>;
  if (reflections.length === 0) return <p className="text-sm sm:text-base">Keine Reflexionen gefunden.</p>;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mt-6 sm:mt-8 min-w-0">
      <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-3 sm:mb-4">
        Deine gespeicherten Reflexionen
      </h2>

      {/* begrenzte Höhe + Scroll auf kleinen Screens */}
      <ul className="space-y-3 sm:space-y-4 md:space-y-6 max-h-[48vh] sm:max-h-[56vh] overflow-y-auto pr-1 sm:pr-2">
        {reflections.map((entry) => (
          <li
            key={entry._id}
            className="border p-3 sm:p-4 rounded-lg bg-gray-50"
          >
            <p className="text-xs sm:text-sm text-gray-500 mb-1">
              {entry.date} – {entry.timeOfDay === "morning" ? "🕊️ Morgen" : "🌙 Abend"}
            </p>
            <p className="text-sm sm:text-base font-medium mb-1 break-words">
              💬 „{entry.reflection}“
            </p>
            <p className="text-xs sm:text-sm text-gray-600 italic break-words">
              Einfluss: {entry.influence}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ReflectionHistory;
