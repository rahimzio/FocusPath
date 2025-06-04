// components/stats/StatsHeatmap.tsx
import React, { useEffect, useState } from "react";
import clsx from "clsx";

interface DayRating {
  date: string;
  rating: string;
}

const getColor = (rating: string) => {
  switch (rating) {
    case "W+ Day": return "bg-green-600";
    case "W Day": return "bg-green-400";
    case "M Day": return "bg-yellow-400";
    case "L Day": return "bg-red-500";
    default: return "bg-gray-200";
  }
};

const StatsHeatmap = ({ userId }: { userId: string }) => {
  const [data, setData] = useState<DayRating[]>([]);

  useEffect(() => {
    const fetchRatings = async () => {
      const res = await fetch(`/api/stats/dailyRatings?userId=${userId}`);
      const json = await res.json();
      if (Array.isArray(json.dailyRatings)) {
        setData(json.dailyRatings.filter((d: any) => d && typeof d.date === "string" && typeof d.rating === "string"));
      } else {
        setData([]);
      }
    };
    if (userId) fetchRatings();
  }, [userId]);

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-3">
      <h3 className="text-lg font-medium mb-2">🔥 Heatmap (letzte 60 Tage)</h3>
      <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
        {data.slice(-60).map((d, idx) => (
          <div
            key={idx}
            title={`${d?.date ?? "-"}: ${d?.rating ?? "?"}`}
            className={clsx("w-5 h-5 rounded-sm", getColor(d?.rating))}
          ></div>
        ))}
      </div>
      <div className="text-xs text-gray-500 pt-1">W+ = dunkelgrün, W = grün, M = gelb, L = rot</div>
    </div>
  );
};

export default StatsHeatmap;
