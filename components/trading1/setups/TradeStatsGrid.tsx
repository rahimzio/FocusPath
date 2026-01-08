"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TradeEntry } from "../interface";

export interface TradeStatsGridProps {
  trades: TradeEntry[];
}

const TradeStatsGrid: React.FC<TradeStatsGridProps> = ({ trades }) => {
  const totalTrades = trades.length;

  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const bes = trades.filter((t) => t.result === "BE").length;

  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const rValues = trades
    .map((t) => t.rMultiple)
    .filter((r): r is number => typeof r === "number");

  const avgR =
    rValues.length > 0
      ? Number((rValues.reduce((sum, r) => sum + r, 0) / rValues.length).toFixed(2))
      : 0;

  const bestR = rValues.length > 0 ? Number(Math.max(...rValues).toFixed(2)) : undefined;

  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Trades gesamt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{totalTrades}</p>
          <p className="text-[11px] text-muted-foreground">
            {wins} Wins / {losses} Losses / {bes} BE
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Winrate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{winRate}%</p>
          <p className="text-[11px] text-muted-foreground">basierend auf allen Live-Trades</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Gesamt PnL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{Number(totalPnL).toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground">Konto-Währung</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Ø R-Multiple</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{rValues.length > 0 ? avgR.toFixed(2) : "-"}</p>
          <p className="text-[11px] text-muted-foreground">nur Trades mit R-Wert</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium">Bestes R</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{bestR !== undefined ? bestR.toFixed(2) : "-"}</p>
          <p className="text-[11px] text-muted-foreground">dein Top-Trade in R</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeStatsGrid;
