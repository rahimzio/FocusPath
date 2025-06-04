// components/stats/StatsDashboard.tsx
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DayRating {
  date: string;
  rating: string;
}

const getRatingValue = (rating: string): number => {
  switch (rating) {
    case "L Day": return 0;
    case "M Day": return 1;
    case "W Day": return 2;
    case "W+ Day": return 2.5;
    default: return 0;
  }
};

const StatsDashboard = ({ userId }: { userId: string }) => {
  const [dailyStats, setDailyStats] = useState<DayRating[]>([]);
  const [consistencyStreak, setConsistencyStreak] = useState<number>(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats/dailyRatings?userId=${userId}`);
        const data = await res.json();
        const ratings = Array.isArray(data.dailyRatings)
          ? data.dailyRatings.filter((r: any) => r && typeof r.date === "string" && typeof r.rating === "string")
          : [];
        setDailyStats(ratings);

        let streak = 0;
        for (let i = ratings.length - 1; i >= 0; i--) {
          const r = ratings[i].rating;
          if (r === "M Day" || r === "W Day" || r === "W+ Day") streak++;
          else break;
        }
        setConsistencyStreak(streak);
      } catch (error) {
        console.error("Fehler beim Laden der Tagesstatistiken:", error);
        setDailyStats([]);
        setConsistencyStreak(0);
      }
    };
    if (userId) fetchStats();
  }, [userId]);

  const chartData = (dailyStats || []).map((d) => ({
    date: d.date?.substring(5) || "-",
    value: getRatingValue(d.rating),
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📊 Dein Fortschritt</h2>

      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-medium mb-2">🔁 Konsistenz</h3>
        <p className="text-sm text-gray-600">
          {consistencyStreak} Tage in Folge mindestens M-Day erreicht
        </p>
      </div>

      {chartData.length > 0 ? (
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="text-lg font-medium mb-2">📈 Tagesbewertung Verlauf</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 3]} ticks={[0, 1, 2, 2.5]} tickFormatter={(v) => {
                switch (v) {
                  case 0: return "L";
                  case 1: return "M";
                  case 2: return "W";
                  case 2.5: return "W+";
                  default: return v;
                }
              }} />
              <Tooltip formatter={(v) => `${v === 2.5 ? "W+" : v === 2 ? "W" : v === 1 ? "M" : "L"} Day`} />
              <Line type="monotone" dataKey="value" stroke="#007AFF" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white p-4 rounded-xl shadow text-gray-500">
          Keine Daten für das Diagramm verfügbar.
        </div>
      )}
    </div>
  );
};

export default StatsDashboard;
