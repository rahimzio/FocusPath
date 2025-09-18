"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const fetcher = (u: string) => fetch(u).then(r => r.json());

export default function InchwormProgress({ userId }: { userId: string }) {
  const { data, error, isLoading } = useSWR<any>(
    userId ? `/api/trading/gameImprovement?userId=${userId}` : null,
    fetcher
  );

  if (error) {
    return (
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="truncate">Inchworm-Fortschritt</CardTitle>
        </CardHeader>
        <CardContent className="text-red-600">Fehler beim Laden.</CardContent>
      </Card>
    );
  }
  if (isLoading || !data) {
    return (
      <Card className="w-full max-w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="truncate">Inchworm-Fortschritt</CardTitle>
        </CardHeader>
        <CardContent className="opacity-70">Lade…</CardContent>
      </Card>
    );
  }

  const plan = data?.plan;
  const baseline = data?.baselineWeekly;
  if (!plan) return null;

  const reduceC = plan.targets?.reduceC ?? {};
  const boostAB = plan.targets?.boostAB ?? {};

  const renderRow = (
    label: string,
    cur: number,
    target: number,
    mode: "max" | "min"
  ) => {
    let pct = 0;
    if (mode === "max") {
      // je niedriger vs Ziel, desto besser (0 = Ziel erreicht oder besser)
      if (target <= 0) pct = cur <= 0 ? 100 : Math.max(0, 100 - cur * 100);
      else pct = Math.max(0, Math.min(100, ((target - cur) / target) * 100));
    } else {
      // je höher vs Ziel, desto besser
      if (target <= 0) pct = 100;
      else pct = Math.max(0, Math.min(100, (cur / target) * 100));
    }

    return (
      <div key={label} className="space-y-1 w-full max-w-full min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs w-full max-w-full min-w-0">
          <span className="truncate break-words min-w-0">{label}</span>
          <span className="shrink-0 whitespace-nowrap tabular-nums">
            {cur} / {target} {mode === "min" ? "↑" : "↓"}/Woche
          </span>
        </div>
        <Progress value={pct} className="w-full" />
      </div>
    );
  };

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Inchworm-Fortschritt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 w-full max-w-full min-w-0">
        {/* C reduzieren */}
        {Object.keys(reduceC).length > 0 && (
          <div className="space-y-2 w-full max-w-full min-w-0">
            <div className="text-sm font-medium">C reduzieren</div>
            {Object.entries(reduceC).map(([label, tgt]) => {
              const cur = Number(
                (baseline?.C?.[label] ?? 0).toFixed?.(2) ?? 0
              );
              return renderRow(label, cur, Number(tgt), "max");
            })}
          </div>
        )}

        {/* A/B steigern */}
        {Object.keys(boostAB).length > 0 && (
          <div className="space-y-2 w-full max-w-full min-w-0">
            <div className="text-sm font-medium">A/B steigern</div>
            {Object.entries(boostAB).map(([label, tgt]) => {
              const cur = Number(
                (baseline?.A?.[label] ?? baseline?.B?.[label] ?? 0).toFixed?.(2) ?? 0
              );
              return renderRow(label, cur, Number(tgt), "min");
            })}
          </div>
        )}

        {Object.keys(reduceC).length === 0 &&
          Object.keys(boostAB).length === 0 && (
            <div className="text-sm text-muted-foreground">
              Keine Ziele gesetzt.
            </div>
          )}
      </CardContent>
    </Card>
  );
}
