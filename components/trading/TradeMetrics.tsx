"use client";
import useSWR from "swr";
import MetricCard from "../finance/MetricCard";

interface TradeMetricsProps {
  userId: string;
  range?: "week" | "month";
}

interface TradeStats {
  count: number;
  avgPnl: number;
  winrate: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeMetrics({ userId, range = "week" }: TradeMetricsProps) {
  const { data } = useSWR<TradeStats>(
    userId ? `/api/trading/getStats?range=${range}&userId=${userId}` : null,
    fetcher
  );

  if (!data) return null;

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard title="Trades" value={data.count} />
      <MetricCard title="Ø PnL" value={data.avgPnl.toFixed(2)} unit="€" />
      <MetricCard title="Winrate" value={(data.winrate * 100).toFixed(1)} unit="%" />
    </div>
  );
}
