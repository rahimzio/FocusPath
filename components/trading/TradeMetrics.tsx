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
  winrate: number; // 0..1
  avgRR?: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function TradeMetrics({ userId, range = "week" }: TradeMetricsProps) {
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy] = React.useState<string | undefined>();

  React.useEffect(() => {
    const applyFromUrl = () => {
      try {
        const url = new URL(window.location.href);
        setAccountId(url.searchParams.get("account") || undefined);
        setStrategy(url.searchParams.get("strategy") || undefined);
      } catch {}
    };
    applyFromUrl();

    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    const onStrategy = (e: any) => setStrategy(e?.detail?.name || undefined);

    window.addEventListener("account-change", onAccount as EventListener);
    window.addEventListener("strategy-select", onStrategy as EventListener);
    window.addEventListener("popstate", applyFromUrl);

    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-select", onStrategy as EventListener);
      window.removeEventListener("popstate", applyFromUrl);
    };
  }, []);

  const qs = React.useMemo(() => {
    const parts = [
      `range=${encodeURIComponent(range)}`,
      `userId=${encodeURIComponent(userId)}`,
      accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
      strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
    ].filter(Boolean);
    return parts.join("&");
  }, [range, userId, accountId, strategy]);

  const { data, error, isLoading } = useSWR<TradeStats>(
    userId ? `/api/trading/getStats?${qs}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 10_000,
    }
  );

  const loading = isLoading || (!data && !error);

  // 🔸 kompakter Stil – wird auf Mobile noch kleiner gerendert
  const compactCard =
    "w-full h-full min-w-0 overflow-hidden " +
    // Innen-Padding reduzieren
    "[&_.p-6]:!p-2 sm:[&_.p-6]:!p-3 " +
    "[&_.pt-6]:!pt-2 sm:[&_.pt-6]:!pt-3 " +
    "[&_.pb-6]:!pb-2 sm:[&_.pb-6]:!pb-3 " +
    // Margins enger
    "[&_.mb-4]:!mb-1 sm:[&_.mb-4]:!mb-2 " +
    "[&_.mt-4]:!mt-1 sm:[&_.mt-4]:!mt-2 " +
    // Typografie runter skalieren
    "[&_.text-2xl]:text-base sm:[&_.text-2xl]:text-lg " +
    "[&_.text-xl]:text-base sm:[&_.text-xl]:text-lg " +
    "[&_.text-base]:text-sm sm:[&_.text-base]:text-base " +
    "[&_.text-sm]:text-xs sm:[&_.text-sm]:text-sm " +
    // Icons/Balken minimal
    "[&_.h-4]:h-3 [&_.w-4]:w-3 sm:[&_.h-4]:h-4 sm:[&_.w-4]:w-4";

return (
  <section
    className="w-full flex"
    aria-live="polite"
    aria-busy={loading ? 'true' : 'false'}
  >
    {/* zentrierter Container mit begrenzter Breite */}
    <div className="w-full max-w-sm sm:max-w-full flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-2 sm:gap-3 px-2">
      {/* Trades */}
      <div className="w-full sm:flex-1">
        <MetricCard
          variant="compact"
          className={compactCard}
          title="Trades"
          value={loading ? 0 : data?.count ?? 0}
          isLoading={loading}
          format="number"
        />
      </div>

      {/* Ø PnL */}
      <div className="w-full sm:flex-1">
        <MetricCard
          variant="compact"
          className={compactCard}
          title="Ø PnL"
          value={loading ? 0 : data?.avgPnl ?? 0}
          isLoading={loading}
          format="currency"
          currency="EUR"
        />
      </div>

      {/* Winrate */}
      <div className="w-full sm:flex-1">
        <MetricCard
          variant="compact"
          className={compactCard}
          title="Winrate"
          value={loading ? 0 : data?.winrate ?? 0}
          isLoading={loading}
          format="percent"
        />
      </div>
    </div>
  </section>
);

}
