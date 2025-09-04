"use client";

import useSWR from "swr";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Stat, StatLabel, StatNumber } from"../ui/stat";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StatsData {
  count: number;
  winrate: number;
  avgPnl: number;
  avgRating: number;
  history?: { day: string; count: number }[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function WeeklySummary({ userId }: { userId: string }) {
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

  const { data: stats, error: statsError } = useSWR<StatsData>(userId ? `/api/trading/getStats?${qs}` : null, fetcher);

  if (statsError) {
    return <div className="text-red-600">Fehler beim Laden.</div>;
  }
  if (!stats) {
    return <div className="opacity-70">Lade…</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat>
            <StatLabel>Trades</StatLabel>
            <StatNumber>{stats.count}</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Winrate</StatLabel>
            <StatNumber>{Math.round(stats.winrate * 100)}%</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø PnL</StatLabel>
            <StatNumber>{stats.avgPnl.toFixed(2)}€</StatNumber>
          </Stat>
          <Stat>
            <StatLabel>Ø Rating</StatLabel>
            <StatNumber>{stats.avgRating.toFixed(1)}</StatNumber>
          </Stat>
        </div>

        {stats.history && stats.history.length > 0 && (
          <AspectRatio ratio={16 / 9}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.history}>
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </AspectRatio>
        )}
      </CardContent>
    </Card>
  );
}
