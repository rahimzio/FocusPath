"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradingSetup, TradeEntry } from "../interface";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { TradeEntryForm } from "../trades/TradeEntryForm";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface SetupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: TradingSetup | null;
}

// Status-Badges für Setups
const statusVariantMap: Record<string, "default" | "secondary" | "outline"> = {
  open: "secondary",
  triggered: "default",
  entered: "default",
  completed: "outline",
  missed: "outline",
  invalidated: "outline",
};

const directionColorMap: Record<string, string> = {
  long: "text-emerald-500",
  short: "text-red-500",
};

// Badge-Styles für Trade-Result
const tradeResultVariantMap: Record<
  TradeEntry["result"],
  "default" | "secondary" | "outline"
> = {
  win: "default",
  BE: "secondary",
  loss: "outline",
};

const SetupDetailDialog: React.FC<SetupDetailDialogProps> = ({
  open,
  onOpenChange,
  setup,
}) => {
  if (!setup) {
    // Kein Setup ausgewählt → leerer Dialog
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Setup-Details</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Kein Setup ausgewählt.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const userId = (setup.userId as string) ?? undefined;

  // Trades für dieses Setup laden (direkt gefiltert über API)
  const {
    data: tradesData,
    error: tradesError,
    isLoading: tradesLoading,
    mutate: mutateTrades,
  } = useSWR(
    open && userId && setup._id
      ? `/api/trading/trades/by-setup?userId=${userId}&setupId=${setup._id}`
      : null,
    fetcher
  );

  const linkedTrades: TradeEntry[] = tradesData?.trades ?? [];

  const [createTradeOpen, setCreateTradeOpen] = React.useState(false);

  function handleTradeCreated() {
    mutateTrades();
    setCreateTradeOpen(false);
  }

  const createdAt = setup.createdAt
    ? new Date(setup.createdAt as string).toLocaleString()
    : undefined;

  const statusVariant = statusVariantMap[setup.status] ?? "outline";

  // --- Mini-Stats für dieses Setup ---
  const total = linkedTrades.length;
  const wins = linkedTrades.filter((t) => t.result === "win").length;
  const losses = linkedTrades.filter((t) => t.result === "loss").length;
  const bes = linkedTrades.filter((t) => t.result === "BE").length;

  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const avgRR =
    total > 0
      ? linkedTrades.reduce(
          (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
          0
        ) / total
      : 0;

  const avgPnL =
    total > 0
      ? linkedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / total
      : 0;

  const avgRating =
    total > 0
      ? Math.round(
          (linkedTrades.reduce(
            (sum, t) => sum + (t.rating ?? 0),
            0
          ) /
            total) *
            10
        ) / 10
      : 0;

  const ruleBreaks = linkedTrades.filter(
    (t) => t.ruleBreak || t.violatedIccRules
  ).length;

  const reviewCount = linkedTrades.filter((t) => t.iccReviewNeeded).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{setup.setupLabel ?? "Setup-Details"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* --- Basis-Infos zum Setup --- */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-tight">
                  {setup.setupLabel ?? "Unbenanntes Setup"}
                </CardTitle>
                <Badge
                  variant={statusVariant}
                  className="text-[10px] uppercase"
                >
                  {setup.status}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {setup.market && <span>{setup.market}</span>}
                {setup.direction && (
                  <span
                    className={cn(
                      "font-medium",
                      directionColorMap[setup.direction] ?? ""
                    )}
                  >
                    {setup.direction.toUpperCase()}
                  </span>
                )}
                {setup.htfTf && <span>HTF: {setup.htfTf}</span>}
                {setup.entryTf && <span>Entry: {setup.entryTf}</span>}
                {createdAt && <span>erstellt: {createdAt}</span>}
              </div>
              {setup.patternType && (
                <p className="text-xs text-muted-foreground">
                  Pattern: {setup.patternType}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              {setup.thoughtProcess && (
                <div>
                  <p className="mb-1 font-medium text-foreground">
                    Thought Process
                  </p>
                  <p className="whitespace-pre-line">
                    {setup.thoughtProcess}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {setup.gameGrade && (
                  <Badge variant="outline" className="text-[10px]">
                    Game: {setup.gameGrade}
                  </Badge>
                )}
                {setup.outcome && (
                  <Badge variant="outline" className="text-[10px]">
                    Outcome: {setup.outcome}
                  </Badge>
                )}
                {setup.decision && (
                  <Badge variant="outline" className="text-[10px]">
                    Decision: {setup.decision}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* --- Trades aus diesem Setup --- */}
          <Card className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Trades aus diesem Setup</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Alle Trades, die mit diesem Setup verknüpft sind (über
                  setupId oder Setup-Name).
                </p>
              </div>

              {userId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCreateTradeOpen(true)}
                >
                  + Trade aus Setup loggen
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {tradesLoading && (
                <p className="text-xs text-muted-foreground">
                  Trades werden geladen...
                </p>
              )}
              {tradesError && (
                <p className="text-xs text-destructive">
                  Fehler beim Laden der Trades für dieses Setup.
                </p>
              )}

              {!tradesLoading &&
                !tradesError &&
                linkedTrades.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Noch keine Trades mit diesem Setup verknüpft.
                  </p>
                )}

              {/* Mini-Stats nur anzeigen, wenn es Trades gibt */}
              {!tradesLoading &&
                !tradesError &&
                linkedTrades.length > 0 && (
                  <>
                    <div className="grid gap-3 md:grid-cols-4 text-xs">
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Trades
                        </p>
                        <p className="text-lg font-semibold">{total}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {wins} Wins · {losses} Losses · {bes} BE
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Winrate
                        </p>
                        <p className="text-lg font-semibold">{winRate}%</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Ø RR & PnL
                        </p>
                        <p className="text-lg font-semibold">
                          {avgRR.toFixed(2)}R
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          PnL: {avgPnL.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Qualität
                        </p>
                        <p className="text-lg font-semibold">
                          {avgRating || 0}/10
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ruleBreaks} Regelbrüche · {reviewCount} Review
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {linkedTrades.map((trade) => {
                        const dateLabel = trade.date
                          ? new Date(trade.date).toLocaleDateString()
                          : "";

                        return (
                          <div
                            key={trade._id as string}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:bg-muted/60"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {trade.symbol}
                                </span>
                                <Badge
                                  variant={
                                    tradeResultVariantMap[trade.result] ??
                                    "outline"
                                  }
                                  className="text-[10px] uppercase"
                                >
                                  {trade.result}
                                </Badge>
                                {typeof trade.pnl === "number" && (
                                  <span
                                    className={cn(
                                      "text-[11px]",
                                      trade.pnl > 0 && "text-emerald-500",
                                      trade.pnl < 0 && "text-red-500"
                                    )}
                                  >
                                    PnL: {trade.pnl.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                {dateLabel && <span>{dateLabel}</span>}
                                {trade.gameGrade && (
                                  <span>Game: {trade.gameGrade}</span>
                                )}
                                {trade.rating != null && (
                                  <span>Rating: {trade.rating}/10</span>
                                )}
                              </div>
                              {trade.thoughts && (
                                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                                  {trade.thoughts}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Innerer Dialog: Trade aus diesem Setup loggen */}
        {userId && (
          <Dialog open={createTradeOpen} onOpenChange={setCreateTradeOpen}>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Trade aus diesem Setup loggen</DialogTitle>
              </DialogHeader>
              <TradeEntryForm
                userId={userId}
                mode="create"
                // ⚠️ Hier gehst du davon aus, dass TradeEntryForm
                // ein initialFormValues-Prop unterstützt.
                // Falls nicht, müssen wir dort noch kurz nachziehen.
                initialFormValues={{
                  symbol: setup.market ?? "",
                  setupLabel: setup.setupLabel ?? "",
                  setupId: (setup._id as string) ?? undefined,
                }}
                onSuccess={handleTradeCreated}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SetupDetailDialog;
