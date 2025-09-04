"use client";

import React from "react";
import useSWR from "swr";
import MetricCard from "../finance/MetricCard";

interface TradeMetricsProps {
  userId: string;
  range?: "week" | "month" | "all";
}

interface TradeStats {
  count: number;
  avgPnl: number;
  winrate: number;     // 0..1
  avgRR?: number;      // ⬅️ NEU: Durchschnittliches Risk-Reward
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeMetrics({ userId, range = "week" }: TradeMetricsProps) {
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy] = React.useState<string | undefined>();

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setAccountId(url.searchParams.get("account") || undefined);
    setStrategy(url.searchParams.get("strategy") || undefined);

    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    const onStrategy = (e: any) => setStrategy(e?.detail?.name || undefined);
    window.addEventListener("account-change", onAccount as EventListener);
    window.addEventListener("strategy-select", onStrategy as EventListener);
    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-select", onStrategy as EventListener);
    };
  }, []);

  const qs = [
    `range=${encodeURIComponent(range)}`,
    `userId=${encodeURIComponent(userId)}`,
    accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
    strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
  ].filter(Boolean).join("&");

  const { data } = useSWR<TradeStats>(userId ? `/api/trading/getStats?${qs}` : null, fetcher);
  if (!data) return null;

  const avgRRDisplay =
    typeof data.avgRR === "number" && Number.isFinite(data.avgRR)
      ? data.avgRR.toFixed(2)
      : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <MetricCard title="Trades" value={data.count} />
      <MetricCard title="Ø PnL" value={data.avgPnl.toFixed(2)} unit="€" />
      <MetricCard title="Winrate" value={(data.winrate * 100).toFixed(1)} unit="%" />
      <MetricCard title="Ø Risk-Reward" value={avgRRDisplay} unit="R" />
    </div>
  );
}
