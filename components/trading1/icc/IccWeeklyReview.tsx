// components/trading1/icc/IccWeeklyReview.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradeEntry, TradingSession } from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

// ------------------------------------------------------
// Helper
// ------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface IccWeeklyReviewProps {
  userId: string;
  className?: string;
}

interface WeekKeyInfo {
  year: number;
  week: number;
  label: string; // z.B. "2025 · KW 13"
}

// ISO-Woche + Jahr berechnen
function getIsoWeekYear(dateStr: string): { year: number; week: number } {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return { year: 1970, week: 1 };
  }

  // Quelle: klassische ISO-Week-Berechnung
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff =
    (target.getTime() - firstThursday.getTime()) / (24 * 3600 * 1000);
  const week = 1 + Math.floor(diff / 7);
  const year = target.getUTCFullYear();
  return { year, week };
}

// Session-Labels
const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

type WeekStats = {
  key: string; // "2025-W13"
  info: WeekKeyInfo;
  trades: TradeEntry[];
  // Aggregates
  total: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  avgRR: number;
  checklistAvg: number; // 0-100
  violations: number;
  reviewCount: number;
  sessionCounts: Record<TradingSession, number>;
};

const checklistKeys: (keyof TradeEntry)[] = [
  "iccChecklistPriceAt4h",
  "iccChecklist1HFollowsTrend",
  "iccChecklistBosSwing",
  "iccChecklistTfCorrelation",
  "iccChecklistEntryImpulseZone",
  "iccChecklistSessionTime",
  "iccChecklistTargetOppositeSide",
];

// ------------------------------------------------------
// Haupt-Komponente: ICC Weekly Review
// ------------------------------------------------------

export const IccWeeklyReview: React.FC<IccWeeklyReviewProps> = ({
  userId,
  className,
}) => {
  const {
    data: tradesData,
    error,
    isLoading,
  } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const allTrades: TradeEntry[] = tradesData?.trades ?? [];

  // Nur ICC-Trades
  const iccTrades = React.useMemo(
    () => allTrades.filter((t) => t.isICC),
    [allTrades]
  );

  const weekStatsList: WeekStats[] = React.useMemo(() => {
    if (iccTrades.length === 0) return [];

    const map = new Map<string, WeekStats>();

    iccTrades.forEach((t) => {
      if (!t.date) return;

      const { year, week } = getIsoWeekYear(t.date);
      const key = `${year}-W${week}`;

      if (!map.has(key)) {
        const info: WeekKeyInfo = {
          year,
          week,
          label: `${year} · KW ${week}`,
        };
        const sessionCounts: Record<TradingSession, number> = {
          asia: 0,
          london: 0,
          new_york: 0,
          other: 0,
        };
        map.set(key, {
          key,
          info,
          trades: [],
          total: 0,
          wins: 0,
          losses: 0,
          be: 0,
          winRate: 0,
          avgRR: 0,
          checklistAvg: 0,
          violations: 0,
          reviewCount: 0,
          sessionCounts,
        });
      }

      const ws = map.get(key)!;
      ws.trades.push(t);
      ws.total += 1;

      if (t.result === "win") ws.wins += 1;
      else if (t.result === "loss") ws.losses += 1;
      else if (t.result === "BE") ws.be += 1;

      if (t.session) {
        const s = t.session as TradingSession;
        if (ws.sessionCounts[s] != null) {
          ws.sessionCounts[s] += 1;
        }
      }

      if (t.violatedIccRules) ws.violations += 1;
      if (t.iccReviewNeeded) ws.reviewCount += 1;
    });

    // Post-processing (Winrate, avgRR, checklistAvg)
    map.forEach((ws) => {
      ws.winRate = ws.total > 0 ? Math.round((ws.wins / ws.total) * 100) : 0;

      // RR – plannedRR oder rMultiple
      if (ws.total > 0) {
        let rrSum = 0;
        let rrCount = 0;
        ws.trades.forEach((t) => {
          const rr = t.plannedRR ?? t.rMultiple;
          if (typeof rr === "number") {
            rrSum += rr;
            rrCount += 1;
          }
        });
        ws.avgRR = rrCount > 0 ? rrSum / rrCount : 0;

        // Checklist-Avg
        let checklistSum = 0;
        let checklistCount = 0;
        ws.trades.forEach((t) => {
          const total = checklistKeys.length;
          const passed = checklistKeys.reduce((cnt, key) => {
            const v = t[key] as unknown as boolean | undefined;
            return cnt + (v ? 1 : 0);
          }, 0);
          checklistSum += total > 0 ? passed / total : 0;
          checklistCount += 1;
        });

        ws.checklistAvg =
          checklistCount > 0
            ? Math.round((checklistSum / checklistCount) * 100)
            : 0;
      }
    });

    // Sortierung: neueste Woche zuerst (nach Jahr+Woche)
    return Array.from(map.values()).sort((a, b) => {
      if (a.info.year !== b.info.year) {
        return b.info.year - a.info.year;
      }
      return b.info.week - a.info.week;
    });
  }, [iccTrades]);

  // Auswahl der aktuellen Woche
  const [selectedWeekKey, setSelectedWeekKey] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (!selectedWeekKey && weekStatsList.length > 0) {
      setSelectedWeekKey(weekStatsList[0].key); // neueste Woche
    }
  }, [selectedWeekKey, weekStatsList]);

  const currentWeek =
    weekStatsList.find((w) => w.key === selectedWeekKey) ?? null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            ICC Weekly Review
          </h2>
          <p className="text-xs text-muted-foreground">
            Wöchentlicher Überblick über deine ICC-Trades – Winrate, RR,
            Sessions, Regeltreue & Review-Queue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedWeekKey ?? undefined}
            onValueChange={(val) => setSelectedWeekKey(val)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Woche wählen" />
            </SelectTrigger>
            <SelectContent>
              {weekStatsList.map((w) => (
                <SelectItem key={w.key} value={w.key}>
                  {w.info.label} ({w.total} Trades)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (weekStatsList.length > 0) {
                setSelectedWeekKey(weekStatsList[0].key);
              }
            }}
          >
            Aktuellste Woche
          </Button>
        </div>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Trades werden geladen...
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der Trades.
        </p>
      )}

      {!isLoading && !error && iccTrades.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Keine ICC-Trades gefunden. Markiere deine ICC-Trades mit dem
          ICC-Checkbox-Feld im Trade-Formular.
        </p>
      )}

      {!isLoading && !error && iccTrades.length > 0 && (
        <>
          {/* Week Overview Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            {weekStatsList.slice(0, 3).map((w) => (
              <Card
                key={w.key}
                className={cn(
                  "cursor-pointer transition hover:border-primary/40",
                  selectedWeekKey === w.key &&
                    "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedWeekKey(w.key)}
              >
                <CardHeader className="space-y-1">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <span>{w.info.label}</span>
                    <Badge
                      variant={
                        selectedWeekKey === w.key ? "default" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {w.total} Trades
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Winrate {w.winRate}% · Ø RR {w.avgRR.toFixed(2)}R ·
                    Checklist ~ {w.checklistAvg}%
                  </p>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* aktuelle Woche Details */}
          {currentWeek && (
            <div className="space-y-4">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Woche
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {currentWeek.info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentWeek.total} ICC-Trades insgesamt
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Winrate &amp; RR
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {currentWeek.winRate}% Win
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ø RR {currentWeek.avgRR.toFixed(2)}R
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Checklist &amp; Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {currentWeek.checklistAvg}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ICC-Checklist Ø erfüllt · Regelbrüche:{" "}
                      {currentWeek.violations}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Review-Queue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {currentWeek.reviewCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ICC-Trades dieser Woche in deiner Review-Queue
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sessions */}
              <div className="grid gap-3 md:grid-cols-4">
                {(["asia", "london", "new_york", "other"] as TradingSession[]).map(
                  (s) => (
                    <Card key={s}>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          {sessionLabel[s]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold">
                          {currentWeek.sessionCounts[s] ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ICC-Trades in dieser Session
                        </p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {/* Trades dieser Woche */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    ICC-Trades dieser Woche
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Übersicht der einzelnen Trades, sortiert nach Datum.
                  </p>
                </CardHeader>
                <CardContent>
                  {currentWeek.trades.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Keine ICC-Trades in dieser Woche.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentWeek.trades
                        .slice()
                        .sort((a, b) => {
                          const da = a.date ? new Date(a.date).getTime() : 0;
                          const db = b.date ? new Date(b.date).getTime() : 0;
                          return db - da;
                        })
                        .map((t) => {
                          const dateLabel = t.date
                            ? new Date(t.date).toLocaleString()
                            : "";
                          const rr = t.plannedRR ?? t.rMultiple;

                          return (
                            <div
                              key={t._id as string}
                              className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-xs hover:bg-muted/60"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-foreground">
                                    {t.symbol} ·{" "}
                                    {t.setupLabel ?? t.setup ?? "Ohne Setup"}
                                  </span>
                                  <Badge
                                    variant={
                                      t.result === "win"
                                        ? "default"
                                        : t.result === "BE"
                                        ? "secondary"
                                        : "outline"
                                    }
                                    className="text-[9px] uppercase"
                                  >
                                    {t.result}
                                  </Badge>
                                  {typeof t.pnl === "number" && (
                                    <span
                                      className={cn(
                                        "text-[11px]",
                                        t.pnl > 0 && "text-emerald-500",
                                        t.pnl < 0 && "text-red-500"
                                      )}
                                    >
                                      PnL: {t.pnl.toFixed(2)}
                                    </span>
                                  )}
                                  {typeof rr === "number" && (
                                    <span className="text-[11px] text-muted-foreground">
                                      RR: {rr}R
                                    </span>
                                  )}
                                </div>
                                {t.iccReviewNeeded && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] uppercase"
                                  >
                                    Review
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {dateLabel && <span>{dateLabel}</span>}
                                {t.session && (
                                  <span>
                                    Session:{" "}
                                    {sessionLabel[t.session] ?? t.session}
                                  </span>
                                )}
                                {t.gameGrade && (
                                  <span>Game: {t.gameGrade}</span>
                                )}
                                {t.rating != null && (
                                  <span>Rating: {t.rating}/10</span>
                                )}
                              </div>

                              {t.psychReason && (
                                <p className="text-[11px] text-muted-foreground">
                                  Grund: {t.psychReason} ·{" "}
                                  {t.psychComment ?? ""}
                                </p>
                              )}

                              {t.violatedIccRules && (
                                <p className="text-[11px] text-red-500">
                                  ICC-Regeln verletzt
                                  {t.violatedRulesNotes
                                    ? `: ${t.violatedRulesNotes}`
                                    : ""}
                                </p>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IccWeeklyReview;
