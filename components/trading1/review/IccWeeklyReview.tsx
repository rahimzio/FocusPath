// components/trading1/review/IccWeeklyReview.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradeEntry, TradingSession, TradeResult } from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface IccWeeklyReviewProps {
  userId: string;
  className?: string;
}

// Session-Label Mapping
const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

type WeekKey = string; // z.B. "2025-W04"

interface IccWeekStats {
  key: WeekKey;
  year: number;
  week: number;
  startDate: Date;
  endDate: Date;
  trades: TradeEntry[];

  total: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;

  avgRR: number;
  violations: number;
  reviewOpen: number;

  bySession: Record<
    TradingSession,
    {
      total: number;
      wins: number;
      losses: number;
      be: number;
      winRate: number;
    }
  >;
}

// ISO-Week Helper
function getIsoWeekInfo(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year.
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

// Montag & Sonntag für eine ISO-Woche berechnen
function getWeekRange(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const monday = new Date(simple);
  monday.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1));

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return { start: monday, end: sunday };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
  });
}

export const IccWeeklyReview: React.FC<IccWeeklyReviewProps> = ({
  userId,
  className,
}) => {
  const {
    data: tradesData,
    error,
    isLoading,
  } = useSWR(userId ? `/api/trading/trades/list?userId=${userId}` : null, fetcher);

  const allTrades: TradeEntry[] = tradesData?.trades ?? [];

  // Nur ICC-Trades
  const iccTrades = React.useMemo(
    () => allTrades.filter((t) => t.isICC),
    [allTrades]
  );

  // Nach ISO-Woche gruppieren
  const weekStats: IccWeekStats[] = React.useMemo(() => {
    const map = new Map<WeekKey, IccWeekStats>();

    iccTrades.forEach((trade) => {
      if (!trade.date) return;
      const date = new Date(trade.date);
      if (Number.isNaN(date.getTime())) return;

      const { year, week } = getIsoWeekInfo(date);
      const key: WeekKey = `${year}-W${String(week).padStart(2, "0")}`;

      if (!map.has(key)) {
        const { start, end } = getWeekRange(year, week);

        const initialBySession: IccWeekStats["bySession"] = {
          asia: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
          london: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
          new_york: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
          other: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
        };

        map.set(key, {
          key,
          year,
          week,
          startDate: start,
          endDate: end,
          trades: [],
          total: 0,
          wins: 0,
          losses: 0,
          be: 0,
          winRate: 0,
          avgRR: 0,
          violations: 0,
          reviewOpen: 0,
          bySession: initialBySession,
        });
      }

      const entry = map.get(key)!;
      entry.trades.push(trade);
    });

    // Kennzahlen pro Woche berechnen
    for (const entry of map.values()) {
      const { trades } = entry;
      const total = trades.length;
      const wins = trades.filter((t) => t.result === "win").length;
      const losses = trades.filter((t) => t.result === "loss").length;
      const be = trades.filter((t) => t.result === "BE").length;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      const rrSum = trades.reduce(
        (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
        0
      );
      const avgRR = total > 0 ? rrSum / total : 0;

      const violations = trades.filter((t) => t.violatedIccRules).length;
      const reviewOpen = trades.filter((t) => t.iccReviewNeeded).length;

      // Session-Aufteilung
      const bySession: IccWeekStats["bySession"] = {
        asia: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
        london: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
        new_york: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
        other: { total: 0, wins: 0, losses: 0, be: 0, winRate: 0 },
      };

      trades.forEach((t) => {
        const s = (t.session ?? "other") as TradingSession;
        const bucket = bySession[s];
        bucket.total += 1;
        if (t.result === "win") bucket.wins += 1;
        if (t.result === "loss") bucket.losses += 1;
        if (t.result === "BE") bucket.be += 1;
      });

      (Object.keys(bySession) as TradingSession[]).forEach((s) => {
        const b = bySession[s];
        b.winRate = b.total > 0 ? Math.round((b.wins / b.total) * 100) : 0;
      });

      entry.total = total;
      entry.wins = wins;
      entry.losses = losses;
      entry.be = be;
      entry.winRate = winRate;
      entry.avgRR = avgRR;
      entry.violations = violations;
      entry.reviewOpen = reviewOpen;
      entry.bySession = bySession;
    }

    // In ein Array umwandeln und nach Woche sortieren (neueste zuerst)
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.week - a.week;
    });
  }, [iccTrades]);

  const [selectedWeekKey, setSelectedWeekKey] = React.useState<WeekKey | "all">(
    "all"
  );

  React.useEffect(() => {
    // Wenn noch nichts ausgewählt → aktuelle Woche wählen, falls vorhanden
    if (selectedWeekKey === "all" && weekStats.length > 0) {
      setSelectedWeekKey(weekStats[0].key);
    }
  }, [weekStats, selectedWeekKey]);

  const selectedWeek =
    selectedWeekKey === "all"
      ? undefined
      : weekStats.find((w) => w.key === selectedWeekKey);

  // Gesamt-ICC-Kennzahlen
  const iccTotal = iccTrades.length;
  const iccWins = iccTrades.filter((t) => t.result === "win").length;
  const iccLosses = iccTrades.filter((t) => t.result === "loss").length;
  const iccBe = iccTrades.filter((t) => t.result === "BE").length;
  const iccWinRate =
    iccTotal > 0 ? Math.round((iccWins / iccTotal) * 100) : 0;

  const iccAvgRR =
    iccTotal > 0
      ? iccTrades.reduce(
          (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
          0
        ) / iccTotal
      : 0;

  const iccViolations = iccTrades.filter((t) => t.violatedIccRules).length;
  const iccReviewOpen = iccTrades.filter((t) => t.iccReviewNeeded).length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            ICC Weekly Review
          </h2>
          <p className="text-xs text-muted-foreground">
            Wöchentliche Auswertung aller ICC-Trades – Winrate, RR, Sessions
            und Review-Queue.
          </p>
        </div>

        {weekStats.length > 0 && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedWeekKey}
              onValueChange={(val) => setSelectedWeekKey(val as WeekKey | "all")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Woche wählen" />
              </SelectTrigger>
              <SelectContent>
                {weekStats.map((w) => (
                  <SelectItem key={w.key} value={w.key}>
                    KW {w.week} · {w.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWeekKey("all")}
            >
              Alle Wochen
            </Button>
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          ICC-Trades werden geladen...
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der ICC-Daten.
        </p>
      )}

      {!isLoading && !error && iccTrades.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Noch keine ICC-Trades erfasst. Logge Trades mit aktiviertem
          &quot;ICC-Trade&quot;-Flag im Journal.
        </p>
      )}

      {!isLoading && !error && iccTrades.length > 0 && (
        <>
          {/* Gesamt-ICC Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ICC-Trades gesamt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{iccTotal}</p>
                <p className="text-xs text-muted-foreground">
                  {iccWins} Wins · {iccLosses} Losses · {iccBe} BE
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ICC-Winrate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{iccWinRate}%</p>
                <p className="text-xs text-muted-foreground">
                  über alle Wochen hinweg
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ø ICC-RR</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {iccAvgRR.toFixed(2)}R
                </p>
                <p className="text-xs text-muted-foreground">
                  Ø rMultiple / plannedRR
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Regelbrüche & Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{iccViolations}x</p>
                <p className="text-xs text-muted-foreground">
                  ICC-Regelbrüche · Review-Queue: {iccReviewOpen} Trades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Woche-Fokus (oben) */}
          {selectedWeek && (
            <Card className="border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">
                    KW {selectedWeek.week} · {selectedWeek.year}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedWeek.startDate)} –{" "}
                    {formatDate(selectedWeek.endDate)} ·{" "}
                    {selectedWeek.total} ICC-Trades
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  Winrate {selectedWeek.winRate}% · Ø RR{" "}
                  {selectedWeek.avgRR.toFixed(2)}R
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>
                    Wins:{" "}
                    <span className="font-semibold text-emerald-500">
                      {selectedWeek.wins}
                    </span>
                  </span>
                  <span>
                    Losses:{" "}
                    <span className="font-semibold text-red-500">
                      {selectedWeek.losses}
                    </span>
                  </span>
                  <span>BE: {selectedWeek.be}</span>
                  <span>
                    Regelbrüche:{" "}
                    <span className="font-semibold">
                      {selectedWeek.violations}
                    </span>
                  </span>
                  <span>
                    Review-Queue:{" "}
                    <span className="font-semibold">
                      {selectedWeek.reviewOpen}
                    </span>
                  </span>
                </div>

                {/* Session Breakdown */}
                <div className="grid gap-3 md:grid-cols-4">
                  {(Object.keys(
                    selectedWeek.bySession
                  ) as TradingSession[]).map((s) => {
                    const b = selectedWeek.bySession[s];
                    if (b.total === 0) return null;
                    return (
                      <div
                        key={s}
                        className="rounded-lg border bg-muted/40 p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {sessionLabel[s]}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {b.winRate}% WR
                          </Badge>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {b.total} Trades · {b.wins} Wins · {b.losses} Losses ·{" "}
                          {b.be} BE
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste aller Wochen (Timeline) */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Alle ICC-Wochen</h3>
            {weekStats.map((w) => {
              const isActive = w.key === selectedWeekKey;
              return (
                <Card
                  key={w.key}
                  className={cn(
                    "cursor-pointer border-l-4 transition",
                    isActive
                      ? "border-l-primary bg-primary/5"
                      : "border-l-transparent hover:border-l-primary/40"
                  )}
                  onClick={() => setSelectedWeekKey(w.key)}
                >
                  <CardContent className="flex flex-col gap-2 py-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          KW {w.week} · {w.year}
                        </p>
                        <p className="text-muted-foreground">
                          {formatDate(w.startDate)} – {formatDate(w.endDate)} ·{" "}
                          {w.total} Trades (WR {w.winRate}%, Ø{" "}
                          {w.avgRR.toFixed(2)}R)
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          {w.wins} W · {w.losses} L · {w.be} BE
                        </Badge>
                        {w.violations > 0 && (
                          <Badge variant="secondary">
                            {w.violations}x Regelbruch
                          </Badge>
                        )}
                        {w.reviewOpen > 0 && (
                          <Badge variant="default">
                            {w.reviewOpen} in Review
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default IccWeeklyReview;
