"use client";
import useSWR from "swr";

interface Props {
  userId: string;
  range?: "week" | "month";
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeStatsOverview({ userId, range = "week" }: Props) {
  const { data } = useSWR(
    userId ? `/api/trades/getStats?range=${range}&userId=${userId}` : null,
    fetcher
  );

  if (!data) return <div>Lade Statistik...</div>;

  return (
    <div className="p-2 bg-white rounded shadow space-y-1 text-sm">
      <div>Anzahl Trades: {data.count}</div>
      <div>Winrate: {Math.round(data.winrate * 100)}%</div>
      <div>Ø PnL: {data.avgPnl}</div>
      <div>Ø Rating: {data.avgRating}</div>
    </div>
  );
}