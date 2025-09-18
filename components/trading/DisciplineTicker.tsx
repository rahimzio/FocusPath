"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DisciplineTicker({ userId, lookback = 200 }: { userId: string; lookback?: number }) {
  const { data, error, isLoading } = useSWR(
    userId ? `/api/trading/getRecent?userId=${userId}&limit=${lookback}` : null,
    fetcher
  );

  const trades: any[] = Array.isArray(data?.items) ? data.items : [];
  const total = trades.length || 0;
  const followed = trades.filter(t => (t?.strategyAdherence ?? t?.strategy_followed) === "yes" || t?.followedSetup === true).length;
  const pct = total ? Math.round((followed / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disziplin (Strategie befolgt)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{followed} / {total} Trades</div>
          <Badge variant="secondary">{pct}%</Badge>
        </div>
        <Progress value={pct} />
        {isLoading && <div className="text-xs opacity-60">Lade…</div>}
        {error && <div className="text-xs text-red-600">Fehler beim Laden</div>}
      </CardContent>
    </Card>
  );
}
