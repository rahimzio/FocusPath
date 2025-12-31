// components/trading1/icc/IccManagementStatsCard.tsx
"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TradeEntry } from "../interface";

interface IccManagementStatsCardProps {
  trades: TradeEntry[];
  title?: string;
  className?: string;
}

interface BoolStat {
  key: keyof TradeEntry;
  label: string;
}

const MANAGEMENT_BOOL_FIELDS: BoolStat[] = [
  {
    key: "managementMarkedHighsLows",
    label: "Lows/Highs markiert",
  },
  {
    key: "managementTookPartialsAtTp1",
    label: "Partials bei TP1 genommen",
  },
  {
    key: "managementClosedOnTrendChange",
    label: "Bei Trendwechsel geschlossen",
  },
  {
    key: "managementHomeTradeUntilSessionEnd",
    label: "Home Trade bis Session-Ende",
  },
];

const MANAGEMENT_STATUS_LABELS: Record<
  NonNullable<TradeEntry["managementStatus"]>,
  string
> = {
  planned: "Planned",
  active: "Active",
  tp1: "TP1 Hit",
  be: "BE",
  closed: "Closed",
  stopped: "Stopped Out",
};

function formatPercent(value: number): string {
  if (Number.isNaN(value)) return "0%";
  return `${value.toFixed(0)}%`;
}

export const IccManagementStatsCard: React.FC<IccManagementStatsCardProps> = ({
  trades,
  title = "ICC Management & Exit Tracking",
  className,
}) => {
  const total = trades.length;

  if (total === 0) {
    return (
      <Card className={cn("text-xs", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-sm">
            <span>{title}</span>
            <Badge variant="outline" className="text-[10px]">
              Keine Trades
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Für diesen Zeitraum gibt es keine ICC-Trades mit Management-Daten.
          </p>
        </CardContent>
      </Card>
    );
  }

  // --- Bool-Stats (Regel-Einhaltung) ---
  const boolStats = MANAGEMENT_BOOL_FIELDS.map((field) => {
    const count = trades.filter((t) => (t[field.key] as boolean | undefined) === true)
      .length;
    const pct = (count / total) * 100;
    return {
      key: field.key,
      label: field.label,
      count,
      pct,
    };
  });

  // --- Exit / Management-Status-Stats ---
  const statusCounts: Record<string, number> = {};
  trades.forEach((t) => {
    const status = t.managementStatus ?? "unknown";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  });

  const statusStats = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => {
      const pct = (count / total) * 100;
      const label =
        status === "unknown"
          ? "Unbekannt / nicht gesetzt"
          : MANAGEMENT_STATUS_LABELS[status as keyof typeof MANAGEMENT_STATUS_LABELS] ??
            status;
      return { status, label, count, pct };
    });

  // --- „Saubere Management-Trades“: alle Booleans true ---
  const fullManagedTrades = trades.filter((t) =>
    MANAGEMENT_BOOL_FIELDS.every((f) => (t[f.key] as boolean | undefined) === true)
  );
  const fullManagedCount = fullManagedTrades.length;
  const fullManagedPct = (fullManagedCount / total) * 100;

  const avgPnL = (items: TradeEntry[]) => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
    return sum / items.length;
  };

  const avgPnLFullManaged = avgPnL(fullManagedTrades);
  const avgPnLOthers = avgPnL(trades.filter((t) => !fullManagedTrades.includes(t)));

  return (
    <Card className={cn("text-xs", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span>{title}</span>
          <Badge variant="outline" className="text-[10px]">
            {total} Trades
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Block 1: Sauberes Management vs. Rest */}
        <div className="rounded-md border bg-muted/40 p-3 space-y-2">
          <p className="text-[11px] font-semibold">
            Saubere Management-Trades (alle Management-Regeln = ✅)
          </p>
          <div className="flex flex-wrap items-baseline gap-4 text-[11px]">
            <div className="space-y-0.5">
              <p className="font-medium">
                {fullManagedCount} / {total} Trades
              </p>
              <p className="text-muted-foreground">
                {formatPercent(fullManagedPct)} mit komplettem Management.
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="font-medium">
                Ø PnL (voll gemanagt):{" "}
                <span
                  className={
                    avgPnLFullManaged > 0
                      ? "text-emerald-600"
                      : avgPnLFullManaged < 0
                      ? "text-red-600"
                      : ""
                  }
                >
                  {avgPnLFullManaged.toFixed(2)}
                </span>
              </p>
              <p className="text-muted-foreground">
                Ø PnL (sonstige):{" "}
                <span
                  className={
                    avgPnLOthers > 0
                      ? "text-emerald-600"
                      : avgPnLOthers < 0
                      ? "text-red-600"
                      : ""
                  }
                >
                  {avgPnLOthers.toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Block 2: Management-Regeln einzeln */}
        <div>
          <p className="mb-2 text-[11px] font-semibold">
            Management-Regeln – Einhaltung
          </p>
          <div className="space-y-1.5">
            {boolStats.map((s) => (
              <div key={String(s.key)} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]">{s.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {s.count} / {total} · {formatPercent(s.pct)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      s.pct >= 70
                        ? "bg-emerald-500"
                        : s.pct >= 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                    )}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Block 3: Exit/Status-Verteilung */}
        <div>
          <p className="mb-2 text-[11px] font-semibold">
            Exit / Management-Status
          </p>
          <div className="space-y-1.5">
            {statusStats.map((s) => (
              <div key={s.status} className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px]">{s.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {s.count} / {total} · {formatPercent(s.pct)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IccManagementStatsCard;
