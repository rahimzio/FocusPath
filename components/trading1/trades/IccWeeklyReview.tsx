// components/trading1/trades/IccWeeklyReview.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import {
  TradeEntry,
  TradingSession,
  TradeResult,
} from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// ------------------------------------------------------
// Helper
// ------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

// ISO-Week Berechnung: Jahr + Woche
function getIsoWeekYearAndWeek(date: Date): { year: number; week: number } {
  // Copy date und auf Donnerstag der aktuellen Woche setzen
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Donnerstag: 4 (0 = So)
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d.getTime() - yearStart.getTime();
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

  return { year: d.getUTCFullYear(), week };
}

function formatWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "unknown";
  const { year, week } = getIsoWeekYearAndWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

interface IccWeeklyReviewProps {
  userId: string;
  className?: string;
}

// ------------------------------------------------------
// Component
// ------------------------------------------------------

export const IccWeeklyReview: React.FC<IccWeeklyReviewProps> = ({
  userId,
  className,
}) => {
  const [selectedWeekKey, setSelectedWeekKey] = React.useState<string | null>(
    null
  );

  const {
    data: tradesData,
    error,
    isLoading,
  } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const allTrades: TradeEntry[] = tradesData?.trades ?? [];
  const iccTrades = allTrades.filter((t) => t.isICC);

  // nach Woche gruppieren
  const weekGroups = React.useMemo(() => {
    const groups: Record<string, TradeEntry[]> = {};
    for (const t of iccTrades) {
      if (!t.date) continue;
      const key = formatWeekKey(t.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [iccTrades]);

  const availableWeeks = React.useMemo(
    () => Object.keys(weekGroups).sort(), // aufsteigend
    [weekGroups]
  );

  // Standard: aktuelle Woche oder letzte vorhandene
  React.useEffect(() => {
    if (!availableWeeks.length) {
      setSelectedWeekKey(null);
      return;
    }

    // Falls schon gesetzt und vorhanden → lassen
    if (selectedWeekKey && availableWeeks.includes(selectedWeekKey)) return;

    // sonst: letzte Woche in der Liste (aktuellste)
    setSelectedWeekKey(availableWeeks[availableWeeks.length - 1]);
  }, [availableWeeks, selectedWeekKey]);

  const currentWeekKey = selectedWeekKey ?? undefined;
  const currentWeekTrades = currentWeekKey
    ? weekGroups[currentWeekKey] ?? []
    : [];

  // Stats für aktuelle Woche
  const totalIccWeek = currentWeekTrades.length;
  const wins = currentWeekTrades.filter((t) => t.result === "win").length;
  const losses = currentWeekTrades.filter((t) => t.result === "loss").length;
  const be = currentWeekTrades.filter((t) => t.result === "BE").length;

  const winRate =
    totalIccWeek > 0 ? Math.round((wins / totalIccWeek) * 100) : 0;

  const avgRR =
    totalIccWeek > 0
      ? currentWeekTrades.reduce(
          (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
          0
        ) / totalIccWeek
      : 0;

  const violations = currentWeekTrades.filter((t) => t.violatedIccRules)
    .length;

  const reviewCount = currentWeekTrades.filter((t) => t.iccReviewNeeded)
    .length;

  // Session-Stats
  const sessions: TradingSession[] = ["asia", "london", "new_york", "other"];
  const sessionCounts: Record<TradingSession, number> = {
    asia: 0,
    london: 0,
    new_york: 0,
    other: 0,
  };
  currentWeekTrades.forEach((t) => {
    if (t.session && sessions.includes(t.session)) {
      sessionCounts[t.session]++;
    }
  });

  // Navigation Woche zurück/weiter
  const handleWeekStep = (direction: "prev" | "next") => {
    if (!currentWeekKey || !availableWeeks.length) return;
    const idx = availableWeeks.indexOf(currentWeekKey);
    if (idx === -1) return;
    if (direction === "prev" && idx > 0) {
      setSelectedWeekKey(availableWeeks[idx - 1]);
    }
    if (direction === "next" && idx < availableWeeks.length - 1) {
      setSelectedWeekKey(availableWeeks[idx + 1]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            ICC Weekly Review
          </h2>
          <p className="text-xs text-muted-foreground">
            Wöchentliche Auswertung nur deiner ICC-Trades – nach Winrate, RR,
            Session und Regel-Treue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Woche wechseln */}
          <button
            type="button"
            onClick={() => handleWeekStep("prev")}
            className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={!currentWeekKey || availableWeeks.length === 0}
          >
            ◀
          </button>
          <Select
            value={currentWeekKey ?? undefined}
            onValueChange={(val) => setSelectedWeekKey(val)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Woche wählen" />
            </SelectTrigger>
            <SelectContent>
              {availableWeeks.map((wk) => (
                <SelectItem key={wk} value={wk}>
                  {wk}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => handleWeekStep("next")}
            className="rounded-full border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            disabled={!currentWeekKey || availableWeeks.length === 0}
          >
            ▶
          </button>
        </div>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          ICC-Trades werden geladen...
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der Trades.
        </p>
      )}

      {!isLoading && !error && iccTrades.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Noch keine ICC-Trades erfasst. Markiere Trades im Journal als
          &quot;ICC&quot;, um sie hier zu sehen.
        </p>
      )}

      {!isLoading && !error && iccTrades.length > 0 && (
        <>
          {!currentWeekKey || totalIccWeek === 0 ? (
            <p className="text-xs text-muted-foreground">
              Für die ausgewählte Woche gibt es keine ICC-Trades.
            </p>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      ICC-Trades in {currentWeekKey}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {totalIccWeek}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {wins} Wins · {losses} Losses · {be} BE
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Winrate (Woche)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {winRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      nur ICC-Trades dieser Woche
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Ø RR (ICC)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {avgRR.toFixed(2)}R
                    </p>
                    <p className="text-xs text-muted-foreground">
                      aus rMultiple / plannedRR
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Regeln & Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {violations}x
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Regelbrüche · Review-Queue: {reviewCount} Trades
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Session Breakdown */}
              <div className="grid gap-4 md:grid-cols-4">
                {(["asia", "london", "new_york", "other"] as TradingSession[]).map(
                  (sess) => (
                    <Card key={sess}>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          {sessionLabel[sess]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold">
                          {sessionCounts[sess]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ICC-Trades in dieser Session
                        </p>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>

              {/* Liste der ICC-Trades der Woche */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    ICC-Trades dieser Woche
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {currentWeekTrades.map((t) => (
                    <div
                      key={t._id ?? `${t.symbol}-${t.date}-${t.entry}`}
                      className="flex flex-col gap-1 rounded-md border bg-muted/40 p-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {t.symbol} ·{" "}
                            {t.setupLabel ?? t.setup ?? "Ohne Setup"}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {t.date}
                          </span>
                          {t.session && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                              {sessionLabel[t.session] ?? t.session}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            variant={
                              t.result === "win"
                                ? "default"
                                : t.result === "loss"
                                ? "outline"
                                : "secondary"
                            }
                            className="text-[9px] uppercase"
                          >
                            {t.result}
                          </Badge>
                          {typeof t.pnl === "number" && (
                            <Badge variant="outline" className="text-[9px]">
                              PnL: {t.pnl.toFixed(2)}
                            </Badge>
                          )}
                          {typeof t.rating === "number" && (
                            <Badge variant="outline" className="text-[9px]">
                              Rating: {t.rating}/10
                            </Badge>
                          )}
                          {t.iccReviewNeeded && (
                            <Badge
                              variant="outline"
                              className="text-[9px] uppercase"
                            >
                              Review
                            </Badge>
                          )}
                          {t.violatedIccRules && (
                            <Badge
                              variant="secondary"
                              className="text-[9px]"
                            >
                              Rule Break
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {typeof t.plannedRR === "number" && (
                          <span>Plan RR: {t.plannedRR}R</span>
                        )}
                        {typeof t.rMultiple === "number" && (
                          <span>Result RR: {t.rMultiple}R</span>
                        )}
                        {t.accountType && (
                          <span>Account: {t.accountType}</span>
                        )}
                        {typeof t.riskPercent === "number" && (
                          <span>Risk: {t.riskPercent}%</span>
                        )}
                      </div>

                      {(t.iccTags && t.iccTags.length > 0) && (
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          {t.iccTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-primary/5 px-2 py-0.5 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {t.psychReason && (
                        <p className="text-[11px] text-muted-foreground">
                          Psych: {t.psychReason}{" "}
                          {t.psychComment ? `– ${t.psychComment}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default IccWeeklyReview;