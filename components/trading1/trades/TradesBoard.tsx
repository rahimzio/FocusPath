// components/trading1/trades/TradesBoard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import {
  TradeEntry,
  TradeGroup,
  TradeResult,
  TradingSession,
  GameGrade,
} from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TradeEntryForm } from "./TradeEntryForm";

// ------------------------------------------------------
// Helper
// ------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface TradesBoardProps {
  userId: string;
  className?: string;
}

// Badge-Styles für Result
const resultVariantMap: Record<
  "win" | "loss" | "BE",
  "default" | "secondary" | "outline"
> = {
  win: "default",
  BE: "secondary",
  loss: "outline",
};

// kleine Farben fürs GameGrade
const gameGradeColorMap: Record<GameGrade, string> = {
  A: "text-emerald-500",
  B: "text-amber-500",
  C: "text-red-500",
};

// Session-Labels
const sessionLabel: Record<TradingSession, string> = {
  asia: "Asia",
  london: "London",
  new_york: "New York",
  other: "Other",
};

// ---- ICC-Regel-Check Typ ----
interface IccRuleCheck {
  id: string;
  label: string;
  ok: boolean;
  note?: string;
}

// Whitelist der ICC-Märkte (an dein Modell anlehnbar)
const ICC_SYMBOL_WHITELIST = [
  "NAS100",
  "NASDAQ",
  "US100",
  "XAUUSD",
  "GOLD",
  "BTCUSD",
  "BTC",
  "ETHUSD",
  "ETH",
  "SOLUSD",
  "SOL",
  "XRPUSD",
  "XRP",
];

// ICC-Regel-Checks aus einem Trade ableiten
function getIccRuleChecks(trade: TradeEntry): IccRuleCheck[] {
  if (!trade.isICC) return [];

  const checks: IccRuleCheck[] = [];

  // 1) Session-Regel (London / NY)
  const sessionOk =
    trade.session === "london" || trade.session === "new_york";
  checks.push({
    id: "session",
    label: "Session: London / New York",
    ok: sessionOk,
    note: trade.session
      ? `Aktuelle Session: ${sessionLabel[trade.session] ?? trade.session}`
      : "Keine Session gesetzt",
  });

  // 2) Asset-Whitelist (Volumen-Märkte)
  const symbol = trade.symbol?.toUpperCase() ?? "";
  const symbolOk = ICC_SYMBOL_WHITELIST.includes(symbol);
  checks.push({
    id: "symbol",
    label: "Volumen-Märkte (NAS100 / Gold / BTC / ETH / SOL / XRP)",
    ok: symbolOk,
    note: symbol ? `Symbol: ${symbol}` : "Kein Symbol gesetzt",
  });

  // 3) Risiko-Regel (Funded 1.5 %, Privat 5 %)
  let riskOk = true;
  let riskNote = "Kein Risiko oder Account-Typ gesetzt";

  if (trade.riskPercent != null && trade.accountType) {
    const maxRisk =
      trade.accountType === "funded"
        ? 1.5
        : trade.accountType === "private"
        ? 5
        : undefined;

    if (maxRisk != null) {
      riskOk = trade.riskPercent <= maxRisk + 1e-9;
      riskNote = `Risiko: ${trade.riskPercent}% · Limit: ${maxRisk}%`;
    }
  }

  checks.push({
    id: "risk",
    label: "Risiko im Rahmen (Funded ≤ 1.5 %, Privat ≤ 5 %)",
    ok: riskOk,
    note: riskNote,
  });

  // 4) RR-Regel (mindestens 2R geplant)
  const rrSource = trade.plannedRR ?? trade.rMultiple;
  const rrOk = typeof rrSource === "number" ? rrSource >= 2 : false;
  checks.push({
    id: "rr",
    label: "Geplanter RR mindestens 2R",
    ok: rrOk,
    note:
      rrSource != null
        ? `Geplanter / realisierter RR: ${rrSource}R`
        : "Kein RR hinterlegt",
  });

  // 5) ICC-Checklist (alle Pflicht-Checkboxen true)
  const checklistKeys: (keyof TradeEntry)[] = [
    "iccChecklistPriceAt4h",
    "iccChecklist1HFollowsTrend",
    "iccChecklistBosSwing",
    "iccChecklistTfCorrelation",
    "iccChecklistEntryImpulseZone",
    "iccChecklistSessionTime",
    "iccChecklistTargetOppositeSide",
  ];

  const checklistTotal = checklistKeys.length;
  let checklistTrue = 0;

  checklistKeys.forEach((key) => {
    const v = trade[key] as unknown as boolean | undefined;
    if (v) checklistTrue += 1;
  });

  const checklistOk = checklistTrue === checklistTotal;

  checks.push({
    id: "checklist",
    label: "ICC-Checklist vollständig erfüllt",
    ok: checklistOk,
    note: `Erfüllt: ${checklistTrue}/${checklistTotal} Checks`,
  });

  return checks;
}

// ------------------------------------------------------
// Haupt-Komponente
// ------------------------------------------------------

export const TradesBoard: React.FC<TradesBoardProps> = ({
  userId,
  className,
}) => {
  const [search, setSearch] = React.useState("");
  const [resultFilter, setResultFilter] =
    React.useState<"all" | TradeResult>("all");
  const [sessionFilter, setSessionFilter] =
    React.useState<"all" | TradingSession>("all");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [iccOnly, setIccOnly] = React.useState(false);
  const [reviewOnly, setReviewOnly] = React.useState(false);

  // Dialog-State
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingTrade, setEditingTrade] = React.useState<TradeEntry | null>(
    null
  );

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailTrade, setDetailTrade] = React.useState<TradeEntry | null>(null);

  // Trades laden
  const {
    data: tradesData,
    error: tradesError,
    isLoading: tradesLoading,
    mutate: mutateTrades,
  } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const trades: TradeEntry[] = tradesData?.trades ?? [];

  // Gruppen laden (für Filter & Labels)
  const { data: groupsData } = useSWR(
    userId ? `/api/trading/groups/list?userId=${userId}` : null,
    fetcher
  );
  const groups: TradeGroup[] = groupsData?.groups ?? [];
  const activeGroups = groups.filter((g) => g.isActive !== false);

  // Filter-Logik
  const normalizedSearch = search.trim().toLowerCase();

  const filteredTrades = trades.filter((t) => {
    if (normalizedSearch) {
      const haystack = `${t.symbol ?? ""} ${
        t.setupLabel ?? t.setup ?? ""
      } ${t.groupName ?? ""} ${(t.tags ?? []).join(" ")} ${(
        t.iccTags ?? []
      ).join(" ")}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (iccOnly && !t.isICC) return false;
    if (reviewOnly && !t.iccReviewNeeded) return false;

    if (resultFilter !== "all" && t.result !== resultFilter) return false;
    if (sessionFilter !== "all" && t.session !== sessionFilter) return false;

    if (groupFilter !== "all") {
      if (t.groupId !== groupFilter) return false;
    }

    return true;
  });

  // ---------------- Stats (gesamt) ----------------
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.result === "win").length;
  const losingTrades = trades.filter((t) => t.result === "loss").length;
  const beTrades = trades.filter((t) => t.result === "BE").length;

  const winRate =
    totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;

  const avgRating =
    totalTrades > 0
      ? Math.round(
          (trades.reduce((sum, t) => sum + (t.rating ?? 0), 0) / totalTrades) *
            10
        ) / 10
      : 0;

  // ---------------- ICC-Stats ----------------
  const iccTrades = trades.filter((t) => t.isICC);
  const iccCount = iccTrades.length;
  const iccWins = iccTrades.filter((t) => t.result === "win").length;
  const iccLosses = iccTrades.filter((t) => t.result === "loss").length;
  const iccBe = iccTrades.filter((t) => t.result === "BE").length;

  const iccWinRate =
    iccCount > 0 ? Math.round((iccWins / iccCount) * 100) : 0;

  const iccAvgRR =
    iccCount > 0
      ? iccTrades.reduce(
          (sum, t) => sum + (t.rMultiple ?? t.plannedRR ?? 0),
          0
        ) / iccCount
      : 0;

  const iccViolations = iccTrades.filter((t) => t.violatedIccRules).length;
  const iccReviewOpen = iccTrades.filter((t) => t.iccReviewNeeded).length;

  // Checklist-Erfüllung (pro Trade: wie viel % der ICC-Checkboxen true sind)
  const checklistKeysForStats: (keyof TradeEntry)[] = [
    "iccChecklistPriceAt4h",
    "iccChecklist1HFollowsTrend",
    "iccChecklistBosSwing",
    "iccChecklistTfCorrelation",
    "iccChecklistEntryImpulseZone",
    "iccChecklistSessionTime",
    "iccChecklistTargetOppositeSide",
  ];

  const iccAvgChecklist =
    iccCount > 0
      ? Math.round(
          (iccTrades.reduce((sum, t) => {
            const total = checklistKeysForStats.length;
            const passed = checklistKeysForStats.reduce((cnt, key) => {
              const v = t[key] as unknown as boolean | undefined;
              return cnt + (v ? 1 : 0);
            }, 0);
            return sum + (total > 0 ? passed / total : 0);
          }, 0) /
            iccCount) *
            100
        )
      : 0;

  const handleOpenEdit = (trade: TradeEntry) => {
    setEditingTrade(trade);
    setEditOpen(true);
  };

  const handleOpenDetail = (trade: TradeEntry) => {
    setDetailTrade(trade);
    setDetailOpen(true);
  };

  const handleTradeSaved = () => {
    mutateTrades();
    setCreateOpen(false);
    setEditOpen(false);
    setEditingTrade(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Trades &amp; Execution
          </h2>
          <p className="text-xs text-muted-foreground">
            Alle Live-Trades – mit Gruppen, Sessions, GameGrade &amp; PnL.
            Dient gleichzeitig als dein Trade-Journal (V2).
          </p>
        </div>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Neuer Trade
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Suche nach Symbol / Setup / Gruppe / Tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:max-w-xs"
              />

              <Select
                value={resultFilter}
                onValueChange={(v) =>
                  setResultFilter(v as "all" | TradeResult)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Results</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="BE">BE</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sessionFilter}
                onValueChange={(v) =>
                  setSessionFilter(v as "all" | TradingSession)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Sessions</SelectItem>
                  <SelectItem value="asia">Asia</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="new_york">New York</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Gruppe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Gruppen</SelectItem>
                  {activeGroups.map((g) => (
                    <SelectItem key={g._id ?? g.name} value={g._id!}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* ICC-only Toggle */}
              <button
                type="button"
                onClick={() => setIccOnly((v) => !v)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                  iccOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {iccOnly ? "Nur ICC-Trades" : "Alle Trades"}
              </button>

              {/* Review-Queue Toggle */}
              <button
                type="button"
                onClick={() => setReviewOnly((v) => !v)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs",
                  reviewOnly
                    ? "border-amber-500 bg-amber-500/10 text-amber-600"
                    : "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {reviewOnly ? "Nur Review-Trades" : "Review-Queue"}
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setResultFilter("all");
                setSessionFilter("all");
                setGroupFilter("all");
                setIccOnly(false);
                setReviewOnly(false);
              }}
            >
              Filter zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats gesamt */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trades gesamt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalTrades}</p>
            <p className="text-xs text-muted-foreground">
              {winningTrades} Wins · {losingTrades} Losses · {beTrades} BE ·{" "}
              {activeGroups.length} aktive Gruppen
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
              bezogen auf alle Trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ø PnL / Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{avgPnL.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">
              in Konto-Währung
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Netto PnL &amp; Ø Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {totalPnL.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Netto PnL · Ø Rating {avgRating}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ICC-Stats (nur wenn ICC-Trades existieren) */}
      {iccCount > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ICC-Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{iccCount}</p>
              <p className="text-xs text-muted-foreground">
                {iccWins} Wins · {iccLosses} Losses · {iccBe} BE · Winrate{" "}
                {iccWinRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ICC-RR &amp; Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {iccAvgRR.toFixed(2)}R
              </p>
              <p className="text-xs text-muted-foreground">
                Ø geplantes RR (rMultiple / plannedRR) ·
                Checklist-Erfüllung ~ {iccAvgChecklist}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ICC-Regeltreue</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {iccViolations}x
              </p>
              <p className="text-xs text-muted-foreground">
                ICC-Trades mit Regelbruch. Review-Queue: {iccReviewOpen} Trades.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trade-Liste */}
      <div className="space-y-3">
        {tradesLoading && (
          <p className="text-xs text-muted-foreground">
            Trades werden geladen...
          </p>
        )}
        {tradesError && (
          <p className="text-xs text-destructive">
            Fehler beim Laden der Trades.
          </p>
        )}

        {!tradesLoading && !tradesError && filteredTrades.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Keine Trades gefunden. Passe deine Filter an oder lege einen neuen
            Trade an.
          </p>
        )}

        {!tradesLoading && !tradesError && filteredTrades.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTrades.map((trade) => (
              <TradeCard
                key={
                  trade._id ?? `${trade.symbol}-${trade.date}-${trade.entry}`
                }
                trade={trade}
                groups={groups}
                onEdit={handleOpenEdit}
                onOpenDetail={handleOpenDetail}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog – Neuer Trade */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Neuen Trade erfassen</DialogTitle>
          </DialogHeader>
          <TradeEntryForm
            userId={userId}
            mode="create"
            onSuccess={handleTradeSaved}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog – Trade bearbeiten */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Trade bearbeiten</DialogTitle>
          </DialogHeader>
          {editingTrade && (
            <TradeEntryForm
              userId={userId}
              mode="edit"
              initialData={editingTrade}
              onSuccess={handleTradeSaved}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog – Trade Detail (ICC-Fokus) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Trade-Details</DialogTitle>
          </DialogHeader>

          {detailTrade && (
            <TradeDetailContent trade={detailTrade} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ------------------------------------------------------
// TradeDetailContent – ausgelagerter Detail-View
// ------------------------------------------------------

const TradeDetailContent: React.FC<{ trade: TradeEntry }> = ({ trade }) => {
  const iccRuleChecks = trade.isICC ? getIccRuleChecks(trade) : [];
  const rulesPassed = iccRuleChecks.filter((c) => c.ok).length;
  const rulesTotal = iccRuleChecks.length;

  return (
    <div className="space-y-4 text-sm">
      {/* Basic */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold">
            {trade.symbol} · {trade.setupLabel ?? trade.setup ?? "Ohne Setup"}
          </p>
          <p className="text-xs text-muted-foreground">
            {trade.date
              ? new Date(trade.date).toLocaleString()
              : ""}
            {trade.session && (
              <>
                {" · "}
                {sessionLabel[trade.session] ?? trade.session}
              </>
            )}
            {trade.accountName && <> · {trade.accountName}</>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {trade.isICC && (
            <Badge variant="secondary" className="text-[10px]">
              ICC
            </Badge>
          )}
          {trade.iccReviewNeeded && (
            <Badge variant="outline" className="text-[10px]">
              Review
            </Badge>
          )}
          <Badge
            variant={resultVariantMap[trade.result] ?? "outline"}
            className="text-[10px] uppercase"
          >
            {trade.result}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            PnL: {trade.pnl?.toFixed(2) ?? "0.00"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Rating: {trade.rating}/10
          </Badge>
        </div>
      </div>

      {/* ICC Block */}
      {trade.isICC && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ICC Setup
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <p>
                <span className="font-medium">HTF Trend:</span>{" "}
                {trade.iccTrendHTF ?? "-"}
              </p>
              <p>
                <span className="font-medium">Part of Trend:</span>{" "}
                {trade.iccTrendPart ?? "-"}
              </p>
              <p>
                <span className="font-medium">4H Status:</span>{" "}
                {trade.iccFourHStatus ?? "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-medium">1H Struktur:</span>{" "}
                {trade.iccOneHStructure ?? "-"}
              </p>
              <p>
                <span className="font-medium">TF-Kombo:</span>{" "}
                {trade.iccTimeframeCombo ?? "-"}
              </p>
              <p>
                <span className="font-medium">ICC Tags:</span>{" "}
                {(trade.iccTags ?? []).join(", ") || "-"}
              </p>
            </div>
          </div>

          <div className="mt-2 grid gap-1 text-xs">
            <p className="font-medium">Checklist:</p>
            <p>
              ✅ Price @ 4H:{" "}
              {trade.iccChecklistPriceAt4h ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ 1H folgt Trend:{" "}
              {trade.iccChecklist1HFollowsTrend ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ BOS Swing:{" "}
              {trade.iccChecklistBosSwing ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ TF-Korrelation:{" "}
              {trade.iccChecklistTfCorrelation ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ Entry aus Impulszone:{" "}
              {trade.iccChecklistEntryImpulseZone ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ Session-Time ok:{" "}
              {trade.iccChecklistSessionTime ? "Ja" : "Nein"}
            </p>
            <p>
              ✅ Target Gegenseite:{" "}
              {trade.iccChecklistTargetOppositeSide ? "Ja" : "Nein"}
            </p>
          </div>
        </div>
      )}

      {/* Risiko & Management */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Risiko
          </p>
          <p>
            <span className="font-medium">Account-Typ:</span>{" "}
            {trade.accountType ?? "-"}
          </p>
          <p>
            <span className="font-medium">Risiko %:</span>{" "}
            {trade.riskPercent ?? "-"}
          </p>
          <p>
            <span className="font-medium">Geplanter RR:</span>{" "}
            {trade.plannedRR ?? "-"}
          </p>
        </div>

        <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Management
          </p>
          <p>
            <span className="font-medium">Status:</span>{" "}
            {trade.managementStatus ?? "-"}
          </p>
          <p>
            <span className="font-medium">
              Lows/Highs markiert:
            </span>{" "}
            {trade.managementMarkedHighsLows ? "Ja" : "Nein"}
          </p>
          <p>
            <span className="font-medium">Partials @ TP1:</span>{" "}
            {trade.managementTookPartialsAtTp1 ? "Ja" : "Nein"}
          </p>
          <p>
            <span className="font-medium">Close bei Trendwechsel:</span>{" "}
            {trade.managementClosedOnTrendChange ? "Ja" : "Nein"}
          </p>
          <p>
            <span className="font-medium">
              Home Trade bis Session-Ende:
            </span>{" "}
            {trade.managementHomeTradeUntilSessionEnd
              ? "Ja"
              : "Nein"}
          </p>
        </div>
      </div>

      {/* 🔍 ICC-Regel-Check */}
      {trade.isICC && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ICC-Regel-Check
          </p>
          <p className="text-xs text-muted-foreground">
            Erfüllte Regeln: {rulesPassed}/{rulesTotal}
          </p>
          <div className="space-y-1 text-xs">
            {iccRuleChecks.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-start justify-between gap-2 rounded-md px-2 py-1",
                  rule.ok
                    ? "bg-emerald-500/5 text-emerald-600"
                    : "bg-red-500/5 text-red-600"
                )}
              >
                <span className="font-medium">{rule.label}</span>
                <span className="text-[11px] text-muted-foreground">
                  {rule.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Psych & Notes */}
      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Psychologie &amp; Notizen
        </p>
        <p>
          <span className="font-medium">Grund:</span>{" "}
          {trade.psychReason ?? "-"}
        </p>
        {trade.psychComment && (
          <p className="text-xs text-muted-foreground">
            {trade.psychComment}
          </p>
        )}
        <p>
          <span className="font-medium">ICC-Regeln verletzt:</span>{" "}
          {trade.violatedIccRules ? "Ja" : "Nein"}
        </p>
        {trade.violatedRulesNotes && (
          <p className="text-xs text-muted-foreground">
            {trade.violatedRulesNotes}
          </p>
        )}
        {trade.iccReviewNeeded && (
          <p>
            <span className="font-medium">In Review-Queue:</span> Ja
          </p>
        )}
        {trade.iccReviewNotes && (
          <p className="text-xs text-muted-foreground">
            Review-Notizen: {trade.iccReviewNotes}
          </p>
        )}
        {trade.thoughts && (
          <p className="text-xs text-muted-foreground">
            Gedanken: {trade.thoughts}
          </p>
        )}
        {trade.notes && (
          <p className="text-xs text-muted-foreground">
            Notizen: {trade.notes}
          </p>
        )}
      </div>

      {/* Screenshots */}
      {(trade.preScreenshotUrl ||
        trade.postScreenshotUrl ||
        trade.screenshotUrl) && (
        <div className="space-y-1 rounded-lg border bg-muted/10 p-3 text-xs">
          <p className="font-semibold uppercase tracking-wide text-muted-foreground">
            Screenshots / Replay
          </p>
          {trade.preScreenshotUrl && (
            <p>
              Pre-Entry:{" "}
              <a
                href={trade.preScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Chart öffnen
              </a>
            </p>
          )}
          {trade.postScreenshotUrl && (
            <p>
              Post-Trade:{" "}
              <a
                href={trade.postScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Chart öffnen
              </a>
            </p>
          )}
          {trade.screenshotUrl && (
            <p>
              Extra:{" "}
              <a
                href={trade.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Chart öffnen
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------
// TradeCard – einzelne Trade-Karte
// ------------------------------------------------------

interface TradeCardProps {
  trade: TradeEntry;
  groups: TradeGroup[];
  onEdit: (trade: TradeEntry) => void;
  onOpenDetail: (trade: TradeEntry) => void;
}

const TradeCard: React.FC<TradeCardProps> = ({
  trade,
  groups,
  onEdit,
  onOpenDetail,
}) => {
  const dateLabel = trade.date
    ? new Date(trade.date).toLocaleDateString()
    : "";

  const group = trade.groupId
    ? groups.find((g) => g._id === trade.groupId)
    : undefined;

  const resultVariant = resultVariantMap[trade.result] ?? "outline";

  return (
    <Card
      className="flex flex-col justify-between cursor-pointer transition hover:border-primary/40"
      onClick={() => onOpenDetail(trade)}
    >
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {trade.symbol} · {trade.setupLabel ?? trade.setup ?? "Ohne Setup"}
          </CardTitle>
          <div className="flex items-center gap-1">
            {trade.isICC && (
              <Badge
                variant="secondary"
                className="text-[9px] uppercase tracking-wide"
              >
                ICC
              </Badge>
            )}
            {trade.iccReviewNeeded && (
              <Badge
                variant="outline"
                className="text-[9px] uppercase tracking-wide"
              >
                Review
              </Badge>
            )}
            <Badge
              variant={resultVariant}
              className="text-[10px] uppercase"
            >
              {trade.result}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {dateLabel && <span>{dateLabel}</span>}
          {trade.session && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
              {sessionLabel[trade.session] ?? trade.session}
            </span>
          )}
          {group && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: group.color ?? "#5227ff",
                }}
              />
              {group.name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Entry: {trade.entry}</span>
          <span>Exit: {trade.exit}</span>
          <span>SL: {trade.stopLoss}</span>
        </div>

        {/* Kurzinfo ICC + Risk */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {trade.isICC && (
            <>
              <span>
                HTF: {trade.iccTrendHTF ?? "-"} ·{" "}
                {trade.iccTrendPart ?? "-"}
              </span>
              {trade.plannedRR && (
                <span>Plan RR: {trade.plannedRR}R</span>
              )}
            </>
          )}
          {trade.riskPercent && (
            <span>Risk: {trade.riskPercent}%</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              PnL: {trade.pnl?.toFixed(2) ?? "0.00"}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Rating: {trade.rating}/10
            </Badge>
            {trade.gameGrade && (
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  gameGradeColorMap[trade.gameGrade]
                )}
              >
                {trade.gameGrade}-Game
              </span>
            )}
            {trade.ruleBreak && (
              <Badge variant="secondary" className="text-[10px]">
                Rule Break
              </Badge>
            )}
          </div>
        </div>

        {trade.tags && trade.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trade.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {trade.iccTags && trade.iccTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trade.iccTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {trade.thoughts && (
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {trade.thoughts}
          </p>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); // verhindert, dass die Karte den Detail-Dialog öffnet
              onEdit(trade);
            }}
          >
            Bearbeiten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradesBoard;
