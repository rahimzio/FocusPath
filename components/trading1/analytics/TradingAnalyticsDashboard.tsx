// components/trading1/analytics/TradingAnalyticsDashboard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import {
  TradeEntry,
  TradeGroup,
  TradingSession,
  GameGrade,
} from "../interface";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface TradingAnalyticsDashboardProps {
  userId: string;
  className?: string;
}

// Session-Labels wiederverwenden
const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

// kleine Farben fürs Game-Grade
const gameGradeColorMap: Record<GameGrade, string> = {
  A: "text-emerald-500",
  B: "text-amber-500",
  C: "text-red-500",
};

export const TradingAnalyticsDashboard: React.FC<
  TradingAnalyticsDashboardProps
> = ({ userId, className }) => {
  // Trades
  const {
    data: tradesData,
    error: tradesError,
    isLoading: tradesLoading,
  } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const trades: TradeEntry[] = tradesData?.trades ?? [];

  // Gruppen (optional, falls Route noch 404 ist, kommen einfach keine Gruppen rein)
  const { data: groupsData } = useSWR(
    userId ? `/api/trading/groups/list?userId=${userId}` : null,
    fetcher
  );
  const groups: TradeGroup[] = groupsData?.groups ?? [];

  // ---------- Basis-Stats ----------
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const bes = trades.filter((t) => t.result === "BE").length;

  const winRate =
    totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgPnL =
    totalTrades > 0 ? totalPnL / totalTrades : 0;

  const avgRating =
    totalTrades > 0
      ? Math.round(
          (trades.reduce((sum, t) => sum + (t.rating ?? 0), 0) /
            totalTrades) *
            10
        ) / 10
      : 0;

  const ruleBreakCount = trades.filter((t) => t.ruleBreak).length;
  const ruleBreakRate =
    totalTrades > 0
      ? Math.round((ruleBreakCount / totalTrades) * 100)
      : 0;

  // ---------- Game-Grade-Verteilung ----------
  const gameGrades: GameGrade[] = ["A", "B", "C"];
  const gameGradeStats = gameGrades.map((g) => {
    const list = trades.filter((t) => t.gameGrade === g);
    const count = list.length;
    const pnl = list.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    return { grade: g, count, pnl };
  });

  // ---------- Session-Stats ----------
  const sessionKeys: TradingSession[] = [
    "asia",
    "london",
    "new_york",
    "other",
  ];

  const sessionStats = sessionKeys.map((key) => {
    const list = trades.filter((t) => t.session === key);
    const count = list.length;
    const sWins = list.filter((t) => t.result === "win").length;
    const sLoss = list.filter((t) => t.result === "loss").length;
    const sBE = list.filter((t) => t.result === "BE").length;
    const winRate =
      count > 0 ? Math.round((sWins / count) * 100) : 0;
    const pnl = list.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

    return {
      key,
      label: sessionLabel[key],
      count,
      wins: sWins,
      losses: sLoss,
      bes: sBE,
      winRate,
      pnl,
    };
  });

  // ---------- Gruppen-Stats ----------
  type GroupStats = {
    key: string;
    label: string;
    count: number;
    wins: number;
    losses: number;
    bes: number;
    winRate: number;
    pnl: number;
  };

  const groupStatsMap = new Map<string, GroupStats>();

  for (const t of trades) {
    const groupIdOrName = t.groupId ?? t.groupName ?? "ohne_gruppe";
    const groupMeta =
      (t.groupId && groups.find((g) => g._id === t.groupId)) || undefined;

    const label =
      groupMeta?.name ??
      t.groupName ??
      (groupIdOrName === "ohne_gruppe" ? "Ohne Gruppe" : groupIdOrName);

    if (!groupStatsMap.has(groupIdOrName)) {
      groupStatsMap.set(groupIdOrName, {
        key: groupIdOrName,
        label,
        count: 0,
        wins: 0,
        losses: 0,
        bes: 0,
        winRate: 0,
        pnl: 0,
      });
    }
    const entry = groupStatsMap.get(groupIdOrName)!;
    entry.count += 1;
    if (t.result === "win") entry.wins += 1;
    if (t.result === "loss") entry.losses += 1;
    if (t.result === "BE") entry.bes += 1;
    entry.pnl += t.pnl ?? 0;
  }

  const groupStats = Array.from(groupStatsMap.values())
    .map((g) => ({
      ...g,
      winRate: g.count > 0 ? Math.round((g.wins / g.count) * 100) : 0,
    }))
    // wichtigste Gruppen zuerst
    .sort((a, b) => b.count - a.count);

  // ---------- Setup-Stats (Top Setups) ----------
  type SetupStats = {
    key: string;
    label: string;
    count: number;
    wins: number;
    losses: number;
    bes: number;
    winRate: number;
    pnl: number;
  };

  const setupStatsMap = new Map<string, SetupStats>();

  for (const t of trades) {
    const lbl =
      t.setupLabel ?? t.setup ?? "Ohne Setup";
    if (!setupStatsMap.has(lbl)) {
      setupStatsMap.set(lbl, {
        key: lbl,
        label: lbl,
        count: 0,
        wins: 0,
        losses: 0,
        bes: 0,
        winRate: 0,
        pnl: 0,
      });
    }
    const s = setupStatsMap.get(lbl)!;
    s.count += 1;
    if (t.result === "win") s.wins += 1;
    if (t.result === "loss") s.losses += 1;
    if (t.result === "BE") s.bes += 1;
    s.pnl += t.pnl ?? 0;
  }

  const setupStats = Array.from(setupStatsMap.values())
    .map((s) => ({
      ...s,
      winRate: s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0,
    }))
    // Top-Setups nach Anzahl
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Trading Analytics
        </h2>
        <p className="text-xs text-muted-foreground">
          Meta-View auf deine Trades – nach Session, Strategien,
          Setups & Mental Game.
        </p>
      </div>

      {/* Loader / Fehler */}
      {tradesLoading && (
        <p className="text-xs text-muted-foreground">
          Lade Analytics-Daten...
        </p>
      )}
      {tradesError && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der Trades. Analytics nicht verfügbar.
        </p>
      )}

      {/* Nur rendern, wenn Daten da sind */}
      {!tradesLoading && !tradesError && (
        <>
          {/* Top-Level-Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Trades gesamt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {totalTrades}
                </p>
                <p className="text-xs text-muted-foreground">
                  {wins} Wins · {losses} Losses · {bes} BE
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Winrate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {winRate}%
                </p>
                <p className="text-xs text-muted-foreground">
                  bezogen auf alle Trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Netto PnL / Ø PnL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {totalPnL.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ø {avgPnL.toFixed(2)} pro Trade
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Mental Game
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {avgRating.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ø Rating · Rule Breaks {ruleBreakRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* GameGrade-Verteilung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Game-Quality Verteilung (A/B/C)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {gameGradeStats.map((g) => (
                <div
                  key={g.grade}
                  className="flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        gameGradeColorMap[g.grade]
                      )}
                    >
                      {g.grade}-Game
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {g.count} Trades
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Netto PnL: {g.pnl.toFixed(2)}
                  </p>
                </div>
              ))}
              {gameGradeStats.every((g) => g.count === 0) && (
                <p className="text-xs text-muted-foreground">
                  Noch keine Game-Grade Daten erfasst.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Session-Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Sessions – Performance nach Zeitzone
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b text-[11px] text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">Session</th>
                    <th className="py-2 pr-2">Trades</th>
                    <th className="py-2 pr-2">Winrate</th>
                    <th className="py-2 pr-2">Wins / L / BE</th>
                    <th className="py-2 pr-2">Netto PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionStats.map((s) => (
                    <tr key={s.key} className="border-b last:border-0">
                      <td className="py-2 pr-2">{s.label}</td>
                      <td className="py-2 pr-2">{s.count}</td>
                      <td className="py-2 pr-2">
                        {s.count > 0 ? `${s.winRate}%` : "-"}
                      </td>
                      <td className="py-2 pr-2">
                        {s.wins} / {s.losses} / {s.bes}
                      </td>
                      <td className="py-2 pr-2">
                        {s.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Gruppen-Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Strategien / Gruppen – welche Sets liefern?
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {groupStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine Gruppen genutzt. Du kannst Gruppen im Tab
                  &quot;Strategien&quot; anlegen und Trades zuordnen.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Gruppe</th>
                      <th className="py-2 pr-2">Trades</th>
                      <th className="py-2 pr-2">Winrate</th>
                      <th className="py-2 pr-2">Wins / L / BE</th>
                      <th className="py-2 pr-2">Netto PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupStats.map((g) => (
                      <tr key={g.key} className="border-b last:border-0">
                        <td className="py-2 pr-2">{g.label}</td>
                        <td className="py-2 pr-2">{g.count}</td>
                        <td className="py-2 pr-2">
                          {g.count > 0 ? `${g.winRate}%` : "-"}
                        </td>
                        <td className="py-2 pr-2">
                          {g.wins} / {g.losses} / {g.bes}
                        </td>
                        <td className="py-2 pr-2">
                          {g.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Top-Setups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Top-Setups nach Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {setupStats.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine Trades mit verknüpften Setups.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-2">Setup</th>
                      <th className="py-2 pr-2">Trades</th>
                      <th className="py-2 pr-2">Winrate</th>
                      <th className="py-2 pr-2">Wins / L / BE</th>
                      <th className="py-2 pr-2">Netto PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {setupStats.map((s) => (
                      <tr key={s.key} className="border-b last:border-0">
                        <td className="py-2 pr-2">{s.label}</td>
                        <td className="py-2 pr-2">{s.count}</td>
                        <td className="py-2 pr-2">
                          {s.count > 0 ? `${s.winRate}%` : "-"}
                        </td>
                        <td className="py-2 pr-2">
                          {s.wins} / {s.losses} / {s.bes}
                        </td>
                        <td className="py-2 pr-2">
                          {s.pnl.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default TradingAnalyticsDashboard;
