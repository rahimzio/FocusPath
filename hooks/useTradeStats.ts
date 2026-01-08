"use client";

import * as React from "react";
import { TradeEntry } from "../../interface";

interface UseTradeStatsArgs {
  trades: TradeEntry[];
}

export function useTradeStats({ trades }: UseTradeStatsArgs) {
  // -----------------------------
  // Basic Counts
  // -----------------------------
  const totalTrades = trades.length;

  const tradeWins = React.useMemo(
    () => trades.filter((t) => t.result === "win").length,
    [trades]
  );

  const tradeLosses = React.useMemo(
    () => trades.filter((t) => t.result === "loss").length,
    [trades]
  );

  const tradeBEs = React.useMemo(
    () => trades.filter((t) => t.result === "BE").length,
    [trades]
  );

  // -----------------------------
  // Winrate
  // -----------------------------
  const tradeWinRate = React.useMemo(() => {
    if (totalTrades === 0) return 0;
    return Math.round((tradeWins / totalTrades) * 100);
  }, [totalTrades, tradeWins]);

  // -----------------------------
  // PnL
  // -----------------------------
  const totalPnL = React.useMemo(
    () => trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0),
    [trades]
  );

  // -----------------------------
  // R-Multiples
  // -----------------------------
  const rValues = React.useMemo(
    () =>
      trades
        .map((t) => t.rMultiple)
        .filter((r): r is number => typeof r === "number"),
    [trades]
  );

  const avgR = React.useMemo(() => {
    if (rValues.length === 0) return 0;
    const sum = rValues.reduce((a, b) => a + b, 0);
    return Number((sum / rValues.length).toFixed(2));
  }, [rValues]);

  const bestR = React.useMemo(() => {
    if (rValues.length === 0) return undefined;
    return Number(Math.max(...rValues).toFixed(2));
  }, [rValues]);

  // -----------------------------
  // Public API
  // -----------------------------
  return {
    totalTrades,
    tradeWins,
    tradeLosses,
    tradeBEs,
    tradeWinRate,
    totalPnL,
    avgR,
    bestR,
  };
}
