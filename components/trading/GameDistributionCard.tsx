// components/GameDistributionCard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { jsonFetcher } from "@/lib/fetcher";

const TRADE_COLORS = ["#10b981", "#f59e0b", "#ef4444"]; // A,B,C
const DAILY_COLORS = ["#059669", "#d97706", "#dc2626"]; // etwas dunkler, damit man unterscheidet

type ABC = { A: number; B: number; C: number };

export default function GameDistributionCard({ userId }: { userId: string }) {
  const [range, setRange] = React.useState<"week" | "month" | "all">("week");

  const tradeKey = userId
    ? `/api/trading/gameStats?userId=${encodeURIComponent(userId)}&range=${range}`
    : null;

  const dailyKey = userId
    ? `/api/trading/dailyGameStats?userId=${encodeURIComponent(userId)}&range=${range}`
    : null;

  // Trades (aus einzelnen Trades/TEF)
  const {
    data: tradeRes,
    isLoading: tradeLoading,
    error: tradeErr,
  } = useSWR<{ total: number; counts: ABC }>(tradeKey, jsonFetcher, {
    revalidateOnFocus: false,
  });

  // Daily Ratings (aus type: "day_reflection")
  const {
    data: dailyRes,
    isLoading: dailyLoading,
    error: dailyErr,
  } = useSWR<{ totalDays: number; counts: ABC }>(dailyKey, jsonFetcher, {
    revalidateOnFocus: false,
  });

  const tradeCounts: ABC = {
    A: tradeRes?.counts?.A ?? 0,
    B: tradeRes?.counts?.B ?? 0,
    C: tradeRes?.counts?.C ?? 0,
  };

  const dailyCounts: ABC = {
    A: dailyRes?.counts?.A ?? 0,
    B: dailyRes?.counts?.B ?? 0,
    C: dailyRes?.counts?.C ?? 0,
  };

  const tradeData = [
    { name: "A", value: tradeCounts.A },
    { name: "B", value: tradeCounts.B },
    { name: "C", value: tradeCounts.C },
  ];

  const dailyData = [
    { name: "A", value: dailyCounts.A },
    { name: "B", value: dailyCounts.B },
    { name: "C", value: dailyCounts.C },
  ];

  const tradeTotal = tradeData.reduce((s, d) => s + d.value, 0);
  const dailyTotal = dailyData.reduce((s, d) => s + d.value, 0);

  const setUrlGrade = React.useCallback((grade: "A" | "B" | "C") => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("grade", grade);
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(
        new CustomEvent("game-grade-change", { detail: { grade } })
      );
    } catch {
      // no-op
    }
  }, []);

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex items-center justify-between gap-2 flex-wrap">
        <CardTitle className="truncate">A/B/C Verteilung</CardTitle>

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
            {!userId && (
              <div className="opacity-70 text-sm">Kein Benutzer gesetzt.</div>
            )}
            {userId && tradeErr && (
              <div className="text-red-600 text-sm">
                Fehler beim Laden (Trades).
              </div>
            )}
            {userId && tradeLoading && (
              <div className="opacity-70 text-sm">Lade Trades…</div>
            )}
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
                      const g = d?.name as "A" | "B" | "C" | undefined;
                      if (g) setUrlGrade(g);
                    }}
                  >
                    {tradeData.map((_, i) => (
                      <Cell
                        key={`trade-slice-${i}`}
                        fill={TRADE_COLORS[i % TRADE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-col gap-2 justify-center w-full max-w-full min-w-0">
            <div className="font-medium mb-1">Trades (A/B/C je Trade)</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white shrink-0">A</Badge>
              <span className="truncate">{tradeCounts.A}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-600 text-white shrink-0">B</Badge>
              <span className="truncate">{tradeCounts.B}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-600 text-white shrink-0">C</Badge>
              <span className="truncate">{tradeCounts.C}</span>
            </div>
            <div className="mt-2 text-sm opacity-70">Total Trades: {tradeTotal}</div>
          </div>
        </div>

        {/* Daily-Ratings-Verteilung (aus Day-Reflections) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-48 sm:h-56 w-full max-w-full min-w-0 overflow-hidden">
            {!userId && (
              <div className="opacity-70 text-sm">Kein Benutzer gesetzt.</div>
            )}
            {userId && dailyErr && (
              <div className="text-red-600 text-sm">
                Fehler beim Laden (Daily).
              </div>
            )}
            {userId && dailyLoading && (
              <div className="opacity-70 text-sm">Lade Daily…</div>
            )}
            {userId && !dailyLoading && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <Pie
                    data={dailyData}
                    dataKey="value"
                    innerRadius={40}
                    outerRadius={60}
                    label={false}
                    labelLine={false}
                  >
                    {dailyData.map((_, i) => (
                      <Cell
                        key={`daily-slice-${i}`}
                        fill={DAILY_COLORS[i % DAILY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-col gap-2 justify-center w-full max-w-full min-w-0">
            <div className="font-medium mb-1">Daily Game (A/B/C je Tag)</div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-700 text-white shrink-0">A</Badge>
              <span className="truncate">{dailyCounts.A}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-700 text-white shrink-0">B</Badge>
              <span className="truncate">{dailyCounts.B}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-rose-700 text-white shrink-0">C</Badge>
              <span className="truncate">{dailyCounts.C}</span>
            </div>
            <div className="mt-2 text-sm opacity-70">Tage gesamt: {dailyTotal}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
