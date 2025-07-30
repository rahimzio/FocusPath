"use client";
import useSWR from "swr";

interface Props {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WeeklySummary({ userId }: Props) {
  const { data } = useSWR(
    userId ? `/api/trades/getStats?range=week&userId=${userId}` : null,
    fetcher
  );
 const { data: mental } = useSWR(
    userId ? `/api/trades/mentalStats?userId=${userId}` : null,
    fetcher
  );
  if (!data || !mental) return <div>Wochendaten laden...</div>;

  return (
    <div className="p-2 bg-white rounded shadow text-sm space-y-1">
      <div>Trades diese Woche: {data.count}</div>
      <div>Winrate: {Math.round(data.winrate * 100)}%</div>
      <div>Ø PnL: {data.avgPnl}</div>
      <div>Ø Rating: {data.avgRating}</div>
       <div>A/B/C: {mental.performance.A}/{mental.performance.B}/{mental.performance.C}</div>
      <div>Ø Disziplin: {Math.round(mental.avgDiscipline)}</div>
    </div>
  );
}