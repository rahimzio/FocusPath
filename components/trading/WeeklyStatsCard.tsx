"use client";

import React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type StatsData = {
  count: number;
  winrate: number;
  avgPnl: number;
  avgRating: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WeeklyStatsCard({ userId }: { userId: string }) {
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
    "range=week",
    `userId=${encodeURIComponent(userId)}`,
    accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
    strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
  ].filter(Boolean).join("&");

  const { data, error, isLoading } = useSWR<StatsData>(userId ? `/api/trading/getStats?${qs}` : null, fetcher);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Stats</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-xs uppercase opacity-70">Trades</div>
              <div className="text-xl font-semibold">{data.count}</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-70">Winrate</div>
              <div className="text-xl font-semibold">{Math.round(data.winrate * 100)}%</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-70">Ø PnL</div>
              <div className="text-xl font-semibold">{data.avgPnl.toFixed(2)}€</div>
            </div>
            <div>
              <div className="text-xs uppercase opacity-70">Ø Rating</div>
              <div className="text-xl font-semibold">{data.avgRating.toFixed(1)}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
