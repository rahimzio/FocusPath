// TradeMetrics.tsx
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
  winrate: number;   // 0..1
  avgRR?: number;
  // optional: totalPnl?: number; // wenn du das in /api implementiert hast
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
    `range=${encodeURIComponent(range)}`, // 👈 kommt aus Settings-Tab (Dashboard)
    `userId=${encodeURIComponent(userId)}`,
    accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
    strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
  ].filter(Boolean).join("&");

  const { data } = useSWR<TradeStats>(userId ? `/api/trading/getStats?${qs}` : null, fetcher);

  const loading = !data;
  const avgRRDisplay =
    !loading && typeof data?.avgRR === "number" && Number.isFinite(data?.avgRR)
      ? data!.avgRR
      : undefined;

  const compactCard =
    "w-full h-full min-w-0 overflow-hidden " +
    "[&_.p-6]:!p-3 sm:[&_.p-6]:!p-4 " +
    "[&_.pb-2]:!pb-1 sm:[&_.pb-2]:!pb-2 " +
    "[&_.text-2xl]:text-lg sm:[&_.text-2xl]:text-2xl " +
    "[&_.text-base]:text-sm sm:[&_.text-base]:text-base " +
    "[&_.text-sm]:text-xs sm:[&_.text-sm]:text-sm " +
    "[&_.h-4]:h-3 [&_.w-4]:w-3 sm:[&_.h-4]:h-4 sm:[&_.w-4]:w-4";

  return (
    <section className="block w-full max-w-full min-w-0">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 auto-rows-fr w-full max-w-full min-w-0">
        <MetricCard
          className={compactCard}
          title="Trades"
          value={loading ? 0 : data!.count}
          isLoading={loading}
          format="number"
        />
        <MetricCard
          className={compactCard}
          title="Ø PnL"
          value={loading ? 0 : data!.avgPnl}
          isLoading={loading}
          format="currency"
          currency="EUR"
        />
        <MetricCard
          className={compactCard}
          title="Winrate"
          value={loading ? 0 : data!.winrate}
          isLoading={loading}
          format="percent"
        />
        {/* Optional: nur wenn /api totalPnl liefert */}
        {/* <MetricCard
          className={compactCard}
          title="P&L (gesamt)"
          value={loading ? 0 : (data as any)?.totalPnl ?? 0}
          isLoading={loading}
          format="currency"
          currency="EUR"
        /> */}
      </div>
    </section>
  );
}
