// components/trading1/setups/TradingSetupsDashboard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradingSetup, TradeEntry } from "../interface";

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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { TradeGroupManager } from "../groups/TradeGroupManager";
import { SetupForm } from "./SetupForm";
import { TradeEntryForm } from "../trades/TradeEntryForm";
import SetupDetailDialog from "./SetupDetailDialog";

// --- Helper: SWR fetcher ---
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface TradingSetupsDashboardProps {
  userId: string;
  className?: string;
}

export const TradingSetupsDashboard: React.FC<
  TradingSetupsDashboardProps
> = ({ userId, className }) => {
  const [activeTab, setActiveTab] =
    React.useState<"open" | "history" | "stats" | "trades" | "groups">("open");

  // 🔹 Detail-Dialog für Setups
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailSetup, setDetailSetup] =
    React.useState<TradingSetup | null>(null);

  // 🔹 Neues Setup – Dialog kontrollieren, damit wir nach Save schließen können
  const [newSetupOpen, setNewSetupOpen] = React.useState(false);

  // Filter für Setups
  const [search, setSearch] = React.useState("");
  const [marketFilter, setMarketFilter] = React.useState<string>("all");
  const [directionFilter, setDirectionFilter] =
    React.useState<string>("all");

  // Filter für Trades
  const [tradeSearch, setTradeSearch] = React.useState("");
  const [tradeSymbolFilter, setTradeSymbolFilter] =
    React.useState<string>("all");
  const [tradeResultFilter, setTradeResultFilter] =
    React.useState<string>("all");
  const [tradeGroupFilter, setTradeGroupFilter] =
    React.useState<string>("all");

  // nur für Setup-Edit-Sheet eigener State
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingSetup, setEditingSetup] = React.useState<TradingSetup | null>(
    null
  );

  // ---- Setups laden ----
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );

  const setups: TradingSetup[] = data?.setups ?? [];

  // ---- Trades laden ----
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

  // ---- Filter-Logik (Setups) ----
  const normalizedSearch = search.trim().toLowerCase();

  const filteredSetups = setups.filter((s) => {
    if (normalizedSearch) {
      const haystack = `${s.market ?? ""} ${s.setupLabel ?? ""} ${
        s.patternType ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (marketFilter !== "all" && s.market !== marketFilter) return false;
    if (directionFilter !== "all" && s.direction !== directionFilter)
      return false;

    return true;
  });

  const openSetups = filteredSetups.filter((s) =>
    ["open", "triggered"].includes(s.status)
  );
  const activeSetups = filteredSetups.filter((s) =>
    ["entered"].includes(s.status)
  );
  const historySetups = filteredSetups.filter((s) =>
    ["completed", "missed", "invalidated"].includes(s.status)
  );

  // --- einfache Setup-Stats ---
  const total = setups.length;
  const completed = setups.filter((s) => s.status === "completed").length;
  const outcomeSet = setups.filter((s) => s.outcome);
  const wins = outcomeSet.filter((s) =>
    ["big_win", "small_win"].includes(s.outcome as string)
  ).length;
  const winRate =
    outcomeSet.length > 0 ? Math.round((wins / outcomeSet.length) * 100) : 0;

  const enteredCount = setups.filter((s) => s.decision === "entered").length;
  const decidedSetups = setups.filter((s) => !!s.decision).length;
  const executionRate =
    decidedSetups > 0
      ? Math.round((enteredCount / decidedSetups) * 100)
      : 0;

  function handleOpenEdit(setup: TradingSetup) {
    setEditingSetup(setup);
    setEditOpen(true);
  }

  function handleSetupSaved() {
    mutate(); // Setups neu laden
    setEditOpen(false);
    setEditingSetup(null);
  }

  const uniqueMarkets = Array.from(
    new Set(setups.map((s) => s.market).filter(Boolean))
  );

  // ---- Trades: Edit-Dialog State ----
  const [tradeEditOpen, setTradeEditOpen] = React.useState(false);
  const [editingTrade, setEditingTrade] = React.useState<TradeEntry | null>(
    null
  );

  function handleOpenEditTrade(trade: TradeEntry) {
    setEditingTrade(trade);
    setTradeEditOpen(true);
  }

  function handleTradeSaved() {
    mutateTrades(); // Trades neu laden
    setTradeEditOpen(false);
    setEditingTrade(null);
  }

  // ---- Trades: kleine Stats (TradeZella-Style Light) ----
  const totalTrades = trades.length;
  const tradeWins = trades.filter((t) => t.result === "win").length;
  const tradeLosses = trades.filter((t) => t.result === "loss").length;
  const tradeBEs = trades.filter((t) => t.result === "BE").length;
  const tradeWinRate =
    totalTrades > 0 ? Math.round((tradeWins / totalTrades) * 100) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  const rValues = trades
    .map((t) => t.rMultiple)
    .filter((r): r is number => typeof r === "number");

  const avgR =
    rValues.length > 0
      ? Number(
          (rValues.reduce((sum, r) => sum + r, 0) / rValues.length).toFixed(2)
        )
      : 0;

  const bestR =
    rValues.length > 0
      ? Number(Math.max(...rValues).toFixed(2))
      : undefined;

  // ---- Trades: Filter-Logik ----
  const normalizedTradeSearch = tradeSearch.trim().toLowerCase();

  const uniqueSymbols = Array.from(
    new Set(trades.map((t) => t.symbol).filter(Boolean))
  );
  const uniqueGroups = Array.from(
    new Set(trades.map((t) => t.groupName).filter(Boolean))
  );

  const filteredTrades = trades.filter((t) => {
    // Suchfeld
    if (normalizedTradeSearch) {
      const haystack = `${t.symbol ?? ""} ${t.setup ?? ""} ${
        t.setupLabel ?? ""
      } ${t.groupName ?? ""} ${t.notes ?? ""}`.toLowerCase();
      if (!haystack.includes(normalizedTradeSearch)) return false;
    }

    // Symbol-Filter
    if (tradeSymbolFilter !== "all" && t.symbol !== tradeSymbolFilter)
      return false;

    // Ergebnis-Filter
    if (tradeResultFilter !== "all" && t.result !== tradeResultFilter)
      return false;

    // Gruppen-Filter
    if (tradeGroupFilter !== "all" && t.groupName !== tradeGroupFilter)
      return false;

    return true;
  });

  return (
    <div className={cn("space-y-4 px-4 pb-6 md:px-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Trading Dashboard (V2)
          </h2>
          <p className="text-xs text-muted-foreground">
            Setups planen, Trades loggen & dein Game auswerten – alles an einem
            Ort.
          </p>
        </div>

        {/* Button: Neues Setup (kontrollierter Dialog) */}
        <Dialog open={newSetupOpen} onOpenChange={setNewSetupOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setNewSetupOpen(true)}>
              + Neues Setup
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Neues Setup anlegen</DialogTitle>
            </DialogHeader>
            <SetupForm
              userId={userId}
              mode="create"
              onSuccess={() => {
                mutate();            // Liste refreshen
                setNewSetupOpen(false); // 🔹 Dialog / Stepper schließen
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter (nur für Setups) */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Suche nach Markt / Setup / Pattern..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:max-w-xs"
              />

              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Markt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Märkte</SelectItem>
                  {uniqueMarkets.map((mkt) => (
                    <SelectItem key={mkt} value={mkt!}>
                      {mkt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={directionFilter}
                onValueChange={setDirectionFilter}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Richtung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Long & Short</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setMarketFilter("all");
                setDirectionFilter("all");
              }}
            >
              Filter zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Setups & Trades & Stats */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="open">Setups: Open / Aktiv</TabsTrigger>
          <TabsTrigger value="history">Setups: History</TabsTrigger>
          <TabsTrigger value="groups">Strategien</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="stats">Setup-Stats</TabsTrigger>
        </TabsList>

        {/* Tab: Open Setups */}
        <TabsContent value="open" className="pt-4 space-y-4">
          {isLoading && (
            <p className="text-xs text-muted-foreground">Lade Setups...</p>
          )}
          {error && (
            <p className="text-xs text-destructive">
              Fehler beim Laden der Setups.
            </p>
          )}

          {!isLoading && !error && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {openSetups.length === 0 && activeSetups.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aktuell keine offenen oder aktiven Setups.
                </p>
              )}

              {openSetups.map((setup) => (
                <SetupCard
                  key={setup._id as string}
                  setup={setup}
                  onEdit={handleOpenEdit}
                  onOpenDetail={(s) => {
                    setDetailSetup(s);
                    setDetailOpen(true);
                  }}
                  userId={userId}
                />
              ))}

              {activeSetups.map((setup) => (
                <SetupCard
                  key={setup._id as string}
                  setup={setup}
                  onEdit={handleOpenEdit}
                  onOpenDetail={(s) => {
                    setDetailSetup(s);
                    setDetailOpen(true);
                  }}
                  userId={userId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Setup History */}
        <TabsContent value="history" className="pt-4">
          {historySetups.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Noch keine abgeschlossenen / verpassten Setups.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {historySetups.map((setup) => (
                <SetupCard
                  key={setup._id as string}
                  setup={setup}
                  onEdit={handleOpenEdit}
                  onOpenDetail={(s) => {
                    setDetailSetup(s);
                    setDetailOpen(true);
                  }}
                  compact
                  userId={userId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 🔹 Tab: Strategien / Gruppen */}
        <TabsContent value="groups" className="pt-4">
          <TradeGroupManager userId={userId} />
        </TabsContent>

        {/* 🔹 TAB: Trades */}
        <TabsContent value="trades" className="pt-4 space-y-4">
          {/* Trades – kleine Stat-Kacheln */}
          <div className="grid gap-3 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium">
                  Trades gesamt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{totalTrades}</p>
                <p className="text-[11px] text-muted-foreground">
                  {tradeWins} Wins / {tradeLosses} Losses / {tradeBEs} BE
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium">
                  Winrate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{tradeWinRate}%</p>
                <p className="text-[11px] text-muted-foreground">
                  basierend auf allen Live-Trades
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium">
                  Gesamt PnL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {totalPnL.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Konto-Währung
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium">
                  Ø R-Multiple
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {rValues.length > 0 ? avgR.toFixed(2) : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  nur Trades mit R-Wert
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium">
                  Bestes R
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">
                  {bestR !== undefined ? bestR.toFixed(2) : "-"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  dein Top-Trade in R
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 🔍 Trade-Filter */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    placeholder="Suche nach Symbol / Setup / Gruppe / Notizen..."
                    value={tradeSearch}
                    onChange={(e) => setTradeSearch(e.target.value)}
                    className="md:max-w-xs"
                  />

                  <Select
                    value={tradeSymbolFilter}
                    onValueChange={setTradeSymbolFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Symbole</SelectItem>
                      {uniqueSymbols.map((sym) => (
                        <SelectItem key={sym} value={sym!}>
                          {sym}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={tradeResultFilter}
                    onValueChange={setTradeResultFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Ergebnis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Win / Loss / BE</SelectItem>
                      <SelectItem value="win">Win</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="BE">BE</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={tradeGroupFilter}
                    onValueChange={setTradeGroupFilter}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Gruppe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Gruppen</SelectItem>
                      {uniqueGroups.map((g) => (
                        <SelectItem key={g} value={g!}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTradeSearch("");
                    setTradeSymbolFilter("all");
                    setTradeResultFilter("all");
                    setTradeGroupFilter("all");
                  }}
                >
                  Filter zurücksetzen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Header + Neuer Trade Button */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Live Trades</h3>
              <p className="text-xs text-muted-foreground">
                Alle Trades, die du wirklich genommen hast (kein Backtesting).
              </p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">+ Neuer Trade</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Neuen Trade eintragen</DialogTitle>
                </DialogHeader>
                <TradeEntryForm
                  userId={userId}
                  mode="create"
                  onSuccess={() => {
                    mutateTrades();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Trade-Liste (gefiltert) */}
          {tradesLoading && (
            <p className="text-xs text-muted-foreground">Lade Trades...</p>
          )}
          {tradesError && (
            <p className="text-xs text-destructive">
              Fehler beim Laden der Trades.
            </p>
          )}

          {!tradesLoading && !tradesError && (
            <>
              {filteredTrades.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Keine Trades passend zu deinem Filter.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredTrades.map((trade) => (
                    <TradeRowCard
                      key={
                        trade._id ??
                        `${trade.date}-${trade.symbol}-${trade.entry}`
                      }
                      trade={trade}
                      onEdit={handleOpenEditTrade}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab: Setup-Stats */}
        <TabsContent value="stats" className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Gesamt-Setups</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{total}</p>
                <p className="text-xs text-muted-foreground">
                  Davon {completed} abgeschlossen
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Setup Winrate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{winRate}%</p>
                <p className="text-xs text-muted-foreground">
                  Basierend auf Outcomes (big/small win vs. loss/BE)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Execution-Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{executionRate}%</p>
                <p className="text-xs text-muted-foreground">
                  Wie oft du ein Setup mit Decision tatsächlich gespielt hast
                  (entered)
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit-Dialog für Setups */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Setup bearbeiten</DialogTitle>
          </DialogHeader>
          {editingSetup && (
            <SetupForm
              userId={userId}
              mode="edit"
              initialData={editingSetup}
              onSuccess={handleSetupSaved}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit-Dialog für Trades */}
      <Dialog open={tradeEditOpen} onOpenChange={setTradeEditOpen}>
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

      {/* 🔹 Setup-Detail-Dialog – global einmal gerendert */}
      <SetupDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailSetup(null);
        }}
        setup={detailSetup}
      />
    </div>
  );
};

// --- Kleine Setup-Card direkt hier im selben File ---
interface SetupCardProps {
  setup: TradingSetup;
  onEdit: (setup: TradingSetup) => void;
  onOpenDetail?: (setup: TradingSetup) => void;
  compact?: boolean;
  userId: string;
}

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

const SetupCard: React.FC<SetupCardProps> = ({
  setup,
  onEdit,
  onOpenDetail,
  compact,
}) => {
  const statusVariant =
    statusVariantMap[setup.status] ?? "outline";

  const created = setup.createdAt
    ? new Date(setup.createdAt as string).toLocaleDateString()
    : undefined;

  return (
    <Card
      className={cn(
        "flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition",
        compact && "opacity-80"
      )}
      onClick={() => onOpenDetail?.(setup)} // 🔹 Klick auf Karte öffnet Detail
    >
      {/* Chart-Preview oben auf der Karte (falls URL vorhanden) */}
      {setup.chartImageUrl && (
        <div className="relative h-24 w-full overflow-hidden rounded-t-xl border-b bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.chartImageUrl}
            alt={setup.setupLabel ?? setup.market}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">
            {setup.setupLabel ?? "Unbenanntes Setup"}
          </CardTitle>
          <Badge variant={statusVariant} className="text-[10px] uppercase">
            {setup.status}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{setup.market}</span>
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
        </div>
        {setup.patternType && (
          <p className="text-xs text-muted-foreground">
            {setup.patternType}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-4">
        {setup.thoughtProcess && !compact && (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {setup.thoughtProcess}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
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
          {created && <span>erstellt: {created}</span>}
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation(); // 🔹 verhindert, dass der Card-Click das Detail-Modal öffnet
              onEdit(setup);
            }}
          >
            Bearbeiten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Kleine Trade-Card für die Liste ---
interface TradeRowCardProps {
  trade: TradeEntry;
  onEdit: (trade: TradeEntry) => void;
}

const tradeResultColorMap: Record<"win" | "loss" | "BE", string> = {
  win: "text-emerald-500",
  loss: "text-red-500",
  BE: "text-slate-500",
};

const TradeRowCard: React.FC<TradeRowCardProps> = ({ trade, onEdit }) => {
  return (
    <Card className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {trade.symbol}
          </span>
          <span>{trade.date}</span>
          <span
            className={cn(
              "font-semibold",
              tradeResultColorMap[trade.result]
            )}
          >
            {trade.result.toUpperCase()}
          </span>
          <span>{trade.pnl.toFixed(2)} PnL</span>
          {typeof trade.rMultiple === "number" && (
            <span>R: {trade.rMultiple.toFixed(2)}</span>
          )}
        </div>
        {trade.setup && (
          <p className="text-[11px] text-muted-foreground">
            Setup: {trade.setup}
          </p>
        )}
        {trade.groupName && (
          <p className="text-[11px] text-muted-foreground">
            Gruppe: {trade.groupName}
          </p>
        )}
        {trade.gameGrade && (
          <p className="text-[11px] text-muted-foreground">
            Game: {trade.gameGrade}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 justify-end">
        {trade.rating && (
          <Badge variant="outline" className="text-[10px]">
            Rating {trade.rating}/10
          </Badge>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(trade)}
        >
          Bearbeiten
        </Button>
      </div>
    </Card>
  );
};

export default TradingSetupsDashboard;
