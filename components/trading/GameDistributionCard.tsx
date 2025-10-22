// components/GameDistributionCard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { jsonFetcher } from "@/lib/fetcher";

const GRADES = ["S", "A", "B", "C"] as const;
type GradeExt = typeof GRADES[number];

type Counts = Record<GradeExt, number>;

// Farb-Map für konsistente Darstellung (S lila)
const COLORS: Record<GradeExt, string> = {
  S: "#a855f7",
  A: "#22c55e",
  B: "#f59e0b",
  C: "#ef4444",
};
// etwas dunklere Variante für Daily
const COLORS_DARK: Record<GradeExt, string> = {
  S: "#7e22ce",
  A: "#059669",
  B: "#d97706",
  C: "#dc2626",
};

function gradeBadgeClass(g: GradeExt) {
  switch (g) {
    case "S": return "bg-purple-600 text-white";
    case "A": return "bg-emerald-600 text-white";
    case "B": return "bg-amber-600 text-white";
    case "C": return "bg-rose-600 text-white";
  }
}

export default function GameDistributionCard({ userId }: { userId: string }) {
  const [range, setRange] = React.useState<"week" | "month" | "all">("week");

  const tradeKey = userId
    ? `/api/trading/gameStats?userId=${encodeURIComponent(userId)}&range=${range}`
    : null;

  const dailyKey = userId
    ? `/api/trading/dailyGameStats?userId=${encodeURIComponent(userId)}&range=${range}`
    : null;

  // SWR etwas „snappier“
  const {
    data: tradeRes,
    isLoading: tradeLoading,
    error: tradeErr,
  } = useSWR<{ total?: number; counts?: Partial<Counts> }>(tradeKey, jsonFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60_000,
  });

  const {
    data: dailyRes,
    isLoading: dailyLoading,
    error: dailyErr,
  } = useSWR<{ totalDays?: number; counts?: Partial<Counts> }>(dailyKey, jsonFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
    dedupingInterval: 60_000,
  });

  // Zählt fehlende S-Werte als 0 (falls Backend noch kein S liefert)
  const tradeCounts: Counts = {
    S: tradeRes?.counts?.S ?? 0,
    A: tradeRes?.counts?.A ?? 0,
    B: tradeRes?.counts?.B ?? 0,
    C: tradeRes?.counts?.C ?? 0,
  };
  const dailyCounts: Counts = {
    S: dailyRes?.counts?.S ?? 0,
    A: dailyRes?.counts?.A ?? 0,
    B: dailyRes?.counts?.B ?? 0,
    C: dailyRes?.counts?.C ?? 0,
  };

  const tradeData = GRADES.map((g) => ({ name: g, value: tradeCounts[g] }));
  const dailyData = GRADES.map((g) => ({ name: g, value: dailyCounts[g] }));

  const tradeTotal = tradeData.reduce((s, d) => s + d.value, 0);
  const dailyTotal = dailyData.reduce((s, d) => s + d.value, 0);

  const setUrlGrade = React.useCallback((grade: GradeExt) => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("grade", grade);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("game-grade-change", { detail: { grade } }));
    } catch {}
  }, []);

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex items-center justify-between gap-2 flex-wrap">
        <CardTitle className="truncate">S/A/B/C Verteilung</CardTitle>

        <div className="flex gap-1 flex-wrap">
          {(["week", "month", "all"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              className="h-8 px-2"
              variant={range === r ? "default" : "secondary"}
              onClick={() => setRange(r)}
            >
              {r === "week" ? "7T" : r === "month" ? "30T" : "All"}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-full min-w-0">
        {/* Trades-Verteilung */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-48 sm:h-56 w-full max-w-full min-w-0 overflow-hidden">
            {!userId && <div className="opacity-70 text-sm">Kein Benutzer gesetzt.</div>}
            {userId && tradeErr && <div className="text-red-600 text-sm">Fehler beim Laden (Trades).</div>}
            {userId && tradeLoading && <div className="opacity-70 text-sm">Lade Trades…</div>}
            {userId && !tradeLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={tradeData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={60}
                    label={false}
                    labelLine={false}
                    onClick={(d: any) => {
                      const g = d?.name as GradeExt | undefined;
                      if (g) setUrlGrade(g);
                    }}
                  >
                    {tradeData.map((d, i) => (
                      <Cell key={`trade-slice-${i}`} fill={COLORS[d.name as GradeExt]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-col gap-2 justify-center w-full max-w-full min-w-0">
            <div className="font-medium mb-1">Trades (Game je Trade)</div>
            {GRADES.map((g) => (
              <div key={`t-${g}`} className="flex items-center gap-2">
                <Badge className={`shrink-0 ${gradeBadgeClass(g)}`}>{g}</Badge>
                <span className="truncate">{tradeCounts[g]}</span>
              </div>
            ))}
            <div className="mt-2 text-sm opacity-70">Total Trades: {tradeTotal}</div>
          </div>
        </div>

        {/* Daily-Ratings-Verteilung (aus Day-Reflections) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-48 sm:h-56 w-full max-w-full min-w-0 overflow-hidden">
            {!userId && <div className="opacity-70 text-sm">Kein Benutzer gesetzt.</div>}
            {userId && dailyErr && <div className="text-red-600 text-sm">Fehler beim Laden (Daily).</div>}
            {userId && dailyLoading && <div className="opacity-70 text-sm">Lade Daily…</div>}
            {userId && !dailyLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie data={dailyData} dataKey="value" innerRadius={40} outerRadius={60} label={false} labelLine={false}>
                    {dailyData.map((d, i) => (
                      <Cell key={`daily-slice-${i}`} fill={COLORS_DARK[d.name as GradeExt]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-col gap-2 justify-center w-full max-w-full min-w-0">
            <div className="font-medium mb-1">Daily Game (je Tag)</div>
            {GRADES.map((g) => (
              <div key={`d-${g}`} className="flex items-center gap-2">
                <Badge className={`shrink-0 ${gradeBadgeClass(g)}`}>{g}</Badge>
                <span className="truncate">{dailyCounts[g]}</span>
              </div>
            ))}
            <div className="mt-2 text-sm opacity-70">Tage gesamt: {dailyTotal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
