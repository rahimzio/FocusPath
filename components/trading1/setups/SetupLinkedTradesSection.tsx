// components/trading1/setups/SetupLinkedTradesSection.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import {
  TradeEntry,
  TradingSession,
  TradeResult,
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

const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

const resultVariantMap: Record<
  TradeResult,
  "default" | "secondary" | "outline"
> = {
  win: "default",
  BE: "secondary",
  loss: "outline",
};

interface SetupLinkedTradesSectionProps {
  userId: string;
  setupId: string;
  className?: string;
}

export const SetupLinkedTradesSection: React.FC<SetupLinkedTradesSectionProps> = ({
  userId,
  setupId,
  className,
}) => {
  const { data, error, isLoading } = useSWR(
    userId && setupId
      ? `/api/trading/trades/by-setup?userId=${userId}&setupId=${setupId}`
      : null,
    fetcher
  );

  const trades: TradeEntry[] = data?.trades ?? [];

  const total = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const bes = trades.filter((t) => t.result === "BE").length;

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const avgRR =
    total > 0
      ? trades.reduce(
          (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
          0
        ) / total
      : 0;

  const avgPnL =
    total > 0
      ? trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / total
      : 0;

  const avgRating =
    total > 0
      ? Math.round(
          (trades.reduce((sum, t) => sum + (t.rating ?? 0), 0) / total) *
            10
        ) / 10
      : 0;

  const ruleBreaks = trades.filter((t) => t.ruleBreak || t.violatedIccRules)
    .length;

  const reviewCount = trades.filter((t) => t.iccReviewNeeded).length;

  return (
    <div className={cn("space-y-4", className)}>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Trades für dieses Setup werden geladen...
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der Setup-Trades.
        </p>
      )}

      {!isLoading && !error && total === 0 && (
        <p className="text-xs text-muted-foreground">
          Für dieses Setup existieren noch keine verknüpften Trades.
          Du kannst bei neuen Trades im Formular dieses Setup auswählen.
        </p>
      )}

      {!isLoading && !error && total > 0 && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Trades · Setup</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{total}</p>
                <p className="text-xs text-muted-foreground">
                  {wins} Wins · {losses} Losses · {bes} BE
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Winrate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">
                  nur für dieses Setup
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ø RR & PnL</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {avgRR.toFixed(2)}R
                </p>
                <p className="text-xs text-muted-foreground">
                  Ø PnL: {avgPnL.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Qualität</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {avgRating || 0}/10
                </p>
                <p className="text-xs text-muted-foreground">
                  {ruleBreaks} Regelbrüche · {reviewCount} in Review
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Liste */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Trades mit diesem Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {trades.map((t) => (
                <div
                  key={t._id ?? `${t.symbol}-${t.date}-${t.entry}`}
                  className="flex flex-col gap-1 rounded-md border bg-muted/40 p-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {t.symbol} · {t.date}
                      </span>
                      {t.session && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                          {sessionLabel[t.session] ?? t.session}
                        </span>
                      )}
                      {t.accountName && (
                        <span className="text-[10px] text-muted-foreground">
                          {t.accountName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant={resultVariantMap[t.result] ?? "outline"}
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
                      {(t.ruleBreak || t.violatedIccRules) && (
                        <Badge variant="secondary" className="text-[9px]">
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
                    {typeof t.riskPercent === "number" && (
                      <span>Risk: {t.riskPercent}%</span>
                    )}
                  </div>

                  {t.iccTags && t.iccTags.length > 0 && (
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
                      Psych: {t.psychReason}
                      {t.psychComment ? ` – ${t.psychComment}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SetupLinkedTradesSection;
