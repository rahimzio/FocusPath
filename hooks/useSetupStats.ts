// components/trading1/setups/useSetupStats.ts
import * as React from "react";
import { TradingSetup } from "../interface";

export interface SetupStats {
  total: number;
  completed: number;
  winRate: number;
  executionRate: number;
}

export function useSetupStats(setups: TradingSetup[]): SetupStats {
  return React.useMemo(() => {
    const total = setups.length;

    const completed = setups.filter(
      (s) => s.status === "completed"
    ).length;

    const outcomeSet = setups.filter((s) => s.outcome);

    const wins = outcomeSet.filter((s) =>
      ["big_win", "small_win"].includes(s.outcome as string)
    ).length;

    const winRate =
      outcomeSet.length > 0
        ? Math.round((wins / outcomeSet.length) * 100)
        : 0;

    const enteredCount = setups.filter(
      (s) => s.decision === "entered"
    ).length;

    const decidedSetups = setups.filter(
      (s) => !!s.decision
    ).length;

    const executionRate =
      decidedSetups > 0
        ? Math.round((enteredCount / decidedSetups) * 100)
        : 0;

    return {
      total,
      completed,
      winRate,
      executionRate,
    };
  }, [setups]);
}
