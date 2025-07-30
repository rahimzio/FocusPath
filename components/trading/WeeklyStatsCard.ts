"use client";
import useSWR from "swr";

interface TopPair {
  pair: string;
  win_rate: number;
}

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WeeklyStatsCard({ userId }: Props) {
  const { data } = useSWR(userId ? `/api/stats/weekly?userId=${userId}` : null, fetcher, { refreshInterval: 300000 });

  if (!data) return <div>Daten laden...</div>;

  const stats = data.stats;
  return (
    <div className="p-4 bg-white rounded shadow space-y-2 text-sm">
      <div>Bestes Paar: {stats.best_pair}</div>
      <div>
        Win-Rate: <span className="font-semibold">{Math.round(stats.win_rate * 100)}%</span>
      </div>
      <div>Veränderung: {stats.pct_change}</div>
      <div className="text-xs text-gray-500">Top Pairs:</div>
      <ul className="text-xs pl-4 list-disc">
        {stats.top_pairs.map((p: TopPair) => (
          <li key={p.pair}>{p.pair}: {Math.round(p.win_rate * 100)}%</li>
        ))}
      </ul>
    </div>
  );
}