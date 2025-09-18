"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function LuckTracker({ userId, lookback = 200 }: { userId: string; lookback?: number }) {
  const { data, error, isLoading } = useSWR(
    userId ? `/api/trading/getRecent?userId=${userId}&limit=${lookback}` : null,
    fetcher
  );

  const trades: any[] = Array.isArray(data?.items) ? data.items : [];
  let pos = 0, neu = 0, neg = 0;
  for (const t of trades) {
    const lf = (t?.luckFactor ?? "").toLowerCase();
    if (lf === "positive") pos++;
    else if (lf === "negative") neg++;
    else neu++;
  }
  const total = trades.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Luck / Varianz (letzte {lookback})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default">Positiv: {pos}</Badge>
          <Badge variant="secondary">Neutral: {neu}</Badge>
          <Badge variant="outline">Negativ: {neg}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Gesamt: {total}. Ziel: Bewusstsein für Varianz, nicht alles als Skill/Fehler werten.
        </div>
        {isLoading && <div className="text-xs opacity-60">Lade…</div>}
        {error && <div className="text-xs text-red-600">Fehler beim Laden</div>}
      </CardContent>
    </Card>
  );
}
