import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

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
  const [filteredStats, setFilteredStats] = useState<DayRating[]>([]);
  const [consistencyStreak, setConsistencyStreak] = useState<number>(0);
  const [filterType, setFilterType] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats/dailyRatings?userId=${userId}`);
        const data = await res.json();

        // nur valide Einträge
        let ratings: DayRating[] = Array.isArray(data.dailyRatings)
          ? data.dailyRatings.filter(
              (r: any) => r && typeof r.date === "string" && typeof r.rating === "string"
            )
          : [];

        // sortiere nach Datum aufsteigend
        ratings.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

        setDailyStats(ratings);
        setFilteredStats(filterData(ratings, filterType, customStart, customEnd));

        // Konsistenz-Streak ab dem neuesten Tag rückwärts zählen
        let streak = 0;
        for (let i = ratings.length - 1; i >= 0; i--) {
          const r = ratings[i].rating;
          if (r === "M Day" || r === "W Day" || r === "W+ Day") {
            streak++;
          } else {
            break;
          }
        }
        setConsistencyStreak(streak);

      } catch (error) {
        console.error("Fehler beim Laden der Tagesstatistiken:", error);
        setDailyStats([]);
        setFilteredStats([]);
        setConsistencyStreak(0);
      }
    };

    if (userId) fetchStats();
  }, [userId, filterType, customStart, customEnd]);

  const filterData = (
    data: DayRating[],
    type: string,
    start?: string,
    end?: string
  ): DayRating[] => {
    const now = dayjs();
    if (type === "7")
      return data.filter((d) => dayjs(d.date).isAfter(now.subtract(7, "day")));
    if (type === "30")
      return data.filter((d) => dayjs(d.date).isAfter(now.subtract(30, "day")));
    if (type === "custom" && start && end) {
      return data.filter((d) =>
        dayjs(d.date).isBetween(dayjs(start), dayjs(end), null, "[]")
      );
    }
    return data;
  };

  useEffect(() => {
    setFilteredStats(filterData(dailyStats, filterType, customStart, customEnd));
  }, [dailyStats, filterType, customStart, customEnd]);

  const chartData = filteredStats.map((d) => ({
    date: d.date.substring(5),
    value: getRatingValue(d.rating),
  }));

  const calculateAverage = (data: DayRating[]) => {
    if (!data.length) return 0;
    const sum = data.reduce((acc, d) => acc + getRatingValue(d.rating), 0);
    return parseFloat((sum / data.length).toFixed(2));
  };

  const countRatings = (data: DayRating[]) => ({
    l: data.filter((d) => d.rating === "L Day").length,
    m: data.filter((d) => d.rating === "M Day").length,
    w: data.filter((d) => d.rating === "W Day").length,
    wp: data.filter((d) => d.rating === "W+ Day").length,
  });

  const currentAvg = calculateAverage(filteredStats);
  const counts = countRatings(filteredStats);

  const pastFiltered = (() => {
    if (filterType === "7") {
      return filterData(
        dailyStats,
        "custom",
        dayjs().subtract(14, "day").format("YYYY-MM-DD"),
        dayjs().subtract(7, "day").format("YYYY-MM-DD")
      );
    }
    if (filterType === "30") {
      return filterData(
        dailyStats,
        "custom",
        dayjs().subtract(60, "day").format("YYYY-MM-DD"),
        dayjs().subtract(30, "day").format("YYYY-MM-DD")
      );
    }
    if (filterType === "custom" && customStart && customEnd) {
      const days =
        dayjs(customEnd).diff(dayjs(customStart), "day") + 1;
      return filterData(
        dailyStats,
        "custom",
        dayjs(customStart).subtract(days, "day").format("YYYY-MM-DD"),
        dayjs(customStart).subtract(1, "day").format("YYYY-MM-DD")
      );
    }
    return [];
  })();

  const pastAvg = calculateAverage(pastFiltered);
  const diff = currentAvg - pastAvg;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">📊 Dein Fortschritt</h2>

      <div className="bg-white p-4 rounded-xl shadow">
        <h3 className="text-lg font-medium mb-2">🔁 Konsistenz</h3>
        <p className="text-sm text-gray-600">
          {consistencyStreak} Tage in Folge mindestens M-Day erreicht
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="7">Letzte 7 Tage</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="custom">Benutzerdefiniert</option>
          </select>

          {filterType === "custom" && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="border rounded px-2 py-1"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Zeitraum: {filteredStats[0]?.date ?? "-"} –{" "}
          {filteredStats.at(-1)?.date ?? "-"}
        </p>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis
                domain={[0, 3]}
                ticks={[0, 1, 2, 2.5]}
                tickFormatter={(v) => {
                  switch (v) {
                    case 0: return "L";
                    case 1: return "M";
                    case 2: return "W";
                    case 2.5: return "W+";
                    default: return v;
                  }
                }}
              />
              <Tooltip
                formatter={(v) =>
                  `${v === 2.5 ? "W+" : v === 2 ? "W" : v === 1 ? "M" : "L"} Day`
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#007AFF"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500">Keine Daten für das Diagramm verfügbar.</p>
        )}

        <div className="text-sm text-gray-700 mt-4">
          Aktueller Schnitt:{" "}
          <span className="font-medium">{currentAvg}</span> – Vorperiode:{" "}
          <span className="font-medium">{pastAvg}</span>
          <br />
          Veränderung:{" "}
          <span
            className={diff >= 0 ? "text-green-600" : "text-red-600"}
          >
            {diff >= 0 ? `+${diff}` : `${diff}`}
          </span>{" "}
          Punkte
        </div>

        <div className="text-sm text-gray-700 mt-4 space-y-1">
          <p>
            Anzahl W+ Days:{" "}
            <span className="font-semibold">{counts.wp}</span>
          </p>
          <p>
            Anzahl W Days:{" "}
            <span className="font-semibold">{counts.w}</span>
          </p>
          <p>
            Anzahl M Days:{" "}
            <span className="font-semibold">{counts.m}</span>
          </p>
          <p>
            Anzahl L Days:{" "}
            <span className="font-semibold">{counts.l}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
