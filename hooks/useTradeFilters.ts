"use client";

import * as React from "react";
import { TradeEntry } from "../../interface";

interface UseTradeFiltersArgs {
  trades: TradeEntry[];
}

export function useTradeFilters({ trades }: UseTradeFiltersArgs) {
  // -----------------------------
  // Filter States
  // -----------------------------
  const [tradeSearch, setTradeSearch] = React.useState("");
  const [tradeSymbolFilter, setTradeSymbolFilter] =
    React.useState<string>("all");
  const [tradeResultFilter, setTradeResultFilter] =
    React.useState<string>("all");
  const [tradeGroupFilter, setTradeGroupFilter] =
    React.useState<string>("all");

  // -----------------------------
  // Derived Filter Options
  // -----------------------------
  const uniqueSymbols = React.useMemo(
    () => Array.from(new Set(trades.map((t) => t.symbol).filter(Boolean))),
    [trades]
  );

  const uniqueGroups = React.useMemo(
    () => Array.from(new Set(trades.map((t) => t.groupName).filter(Boolean))),
    [trades]
  );

  // -----------------------------
  // Filtered Trades
  // -----------------------------
  const filteredTrades = React.useMemo(() => {
    const normalizedSearch = tradeSearch.trim().toLowerCase();

    return trades.filter((t) => {
      // Suche
      if (normalizedSearch) {
        const haystack = `${t.symbol ?? ""} ${t.setup ?? ""} ${
          t.setupLabel ?? ""
        } ${t.groupName ?? ""} ${t.notes ?? ""}`.toLowerCase();

        if (!haystack.includes(normalizedSearch)) return false;
      }

      // Symbol
      if (tradeSymbolFilter !== "all" && t.symbol !== tradeSymbolFilter)
        return false;

      // Result
      if (tradeResultFilter !== "all" && t.result !== tradeResultFilter)
        return false;

      // Group
      if (tradeGroupFilter !== "all" && t.groupName !== tradeGroupFilter)
        return false;

      return true;
    });
  }, [
    trades,
    tradeSearch,
    tradeSymbolFilter,
    tradeResultFilter,
    tradeGroupFilter,
  ]);

  // -----------------------------
  // Helpers
  // -----------------------------
  function resetTradeFilters() {
    setTradeSearch("");
    setTradeSymbolFilter("all");
    setTradeResultFilter("all");
    setTradeGroupFilter("all");
  }

  // -----------------------------
  // Public API
  // -----------------------------
  return {
    // state
    tradeSearch,
    tradeSymbolFilter,
    tradeResultFilter,
    tradeGroupFilter,

    // setters
    setTradeSearch,
    setTradeSymbolFilter,
    setTradeResultFilter,
    setTradeGroupFilter,

    // derived
    uniqueSymbols,
    uniqueGroups,
    filteredTrades,

    // helpers
    resetTradeFilters,
  };
}
