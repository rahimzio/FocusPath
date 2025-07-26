// components/stats/WeekMonthStatsDisplay.tsx
import React, { useEffect, useState } from "react";

interface WeekRating {
  weekStart: string;
  score: number;
  rating: string;
}

interface MonthRating {
  weeks: string[];
  rating: string;
}

export default function WeekMonthStatsDisplay({ userId }: { userId: string }) {
  const [weekRatings, setWeekRatings] = useState<WeekRating[]>([]);
  const [monthRatings, setMonthRatings] = useState<MonthRating[]>([]);

  useEffect(() => {
    const fetchRatings = async () => {
      const res = await fetch(`/api/stats/weekMonthRatings?userId=${userId}`);
      const data = await res.json();
      setWeekRatings(data.weekRatings || []);
      setMonthRatings((data.recentMonthRatings || []).filter((m: MonthRating) => Array.isArray(m.weeks) && m.weeks.length > 0));
    };
    console.log("Geladene weekRatings:", weekRatings);
    console.log("Geladene monthRatings:", monthRatings);

    fetchRatings();
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-medium mb-2">📅 Wochen-Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {weekRatings.map((w, index) => (
            <div
              key={index}
              className="p-3 border rounded-lg shadow-sm bg-gray-50 text-center"
            >
              <p className="text-xs text-gray-500">KW ab {w.weekStart.slice(5)}</p>
              <p className="font-bold text-md">{w.rating}</p>
              <p className="text-sm text-gray-500">Score: {w.score.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-medium mb-2">🗓️ Monatsbewertung</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {monthRatings.map((m, index) => (
            <div
              key={index}
              className="p-3 border rounded-lg shadow-sm bg-gray-50 text-center"
            >
              <p className="text-xs text-gray-500">
                Monat ab {m.weeks?.[0] ? m.weeks[0].slice(5) : "?"}
              </p>
              <p className="font-bold text-md">{m.rating}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
