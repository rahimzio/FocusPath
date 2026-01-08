"use client";

import * as React from "react";
import { TradingSetup } from "../../interface";

type DirectionFilter = "all" | "long" | "short";

interface UseSetupFiltersArgs {
  setups: TradingSetup[];
}

export function useSetupFilters({ setups }: UseSetupFiltersArgs) {
  // -----------------------------
  // Filter State
  // -----------------------------
  const [search, setSearch] = React.useState("");
  const [marketFilter, setMarketFilter] = React.useState<string>("all");
  const [directionFilter, setDirectionFilter] =
    React.useState<DirectionFilter>("all");

  // -----------------------------
  // Derived Data
  // -----------------------------
  const uniqueMarkets = React.useMemo(
    () =>
      Array.from(
        new Set(setups.map((s) => s.market).filter(Boolean))
      ),
    [setups]
  );

  const normalizedSearch = React.useMemo(
    () => search.trim().toLowerCase(),
    [search]
  );

  const filteredSetups = React.useMemo(() => {
    return setups.filter((s) => {
      // 🔍 Textsuche
      if (normalizedSearch) {
        const haystack = `${s.market ?? ""} ${s.setupLabel ?? ""} ${
          s.patternType ?? ""
        }`.toLowerCase();

        if (!haystack.includes(normalizedSearch)) return false;
      }

      // 📊 Markt-Filter
      if (marketFilter !== "all" && s.market !== marketFilter) return false;

      // 📈 Richtung-Filter
      if (
        directionFilter !== "all" &&
        s.direction !== directionFilter
      )
        return false;

      return true;
    });
  }, [setups, normalizedSearch, marketFilter, directionFilter]);

  // -----------------------------
  // Status-Gruppierung
  // -----------------------------
  const openSetups = React.useMemo(
    () =>
      filteredSetups.filter((s) =>
        ["open", "triggered"].includes(s.status)
      ),
    [filteredSetups]
  );

  const activeSetups = React.useMemo(
    () => filteredSetups.filter((s) => s.status === "entered"),
    [filteredSetups]
  );

  const historySetups = React.useMemo(
    () =>
      filteredSetups.filter((s) =>
        ["completed", "missed", "invalidated"].includes(s.status)
      ),
    [filteredSetups]
  );

  // -----------------------------
  // Helpers
  // -----------------------------
  function resetFilters() {
    setSearch("");
    setMarketFilter("all");
    setDirectionFilter("all");
  }

  // -----------------------------
  // Public API
  // -----------------------------
  return {
    // state
    search,
    marketFilter,
    directionFilter,

    // setters
    setSearch,
    setMarketFilter,
    setDirectionFilter,

    // derived
    uniqueMarkets,
    openSetups,
    activeSetups,
    historySetups,

    // helpers
    resetFilters,
  };
}
