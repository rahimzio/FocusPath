"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradingSetup, TradeEntry } from "../interface";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

import SetupFilters from "./SetupFilters";
import TradeStatsGrid from "./TradeStatsGrid";
import { useTradeFilters } from "@/hooks/useTradeFilters";
import SetupCard from "./SetupCard";

// ✅ NEW: Accounts Tab
import AccountManager from "../accounts/AccountManager";

// -----------------------------
// SWR fetcher
// -----------------------------
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

interface TradingSetupsDashboardProps {
  userId: string;
  className?: string;
}

export const TradingSetupsDashboard: React.FC<TradingSetupsDashboardProps> = ({
  userId,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState<
    "open" | "history" | "trades" | "groups" | "stats" | "accounts"
  >("open");

  // -----------------------------
  // Dialog States
  // -----------------------------
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailSetup, setDetailSetup] = React.useState<TradingSetup | null>(
    null
  );

  const [newSetupOpen, setNewSetupOpen] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingSetup, setEditingSetup] = React.useState<TradingSetup | null>(
    null
  );

  const [tradeEditOpen, setTradeEditOpen] = React.useState(false);
  const [editingTrade, setEditingTrade] = React.useState<TradeEntry | null>(
    null
  );

  // -----------------------------
  // Data
  // -----------------------------
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );

  const setups: TradingSetup[] = data?.setups ?? [];

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

  // -----------------------------
  // Setup Filters (State)
  // -----------------------------
  const [search, setSearch] = React.useState("");
  const [marketFilter, setMarketFilter] = React.useState<string>("all");
  const [directionFilter, setDirectionFilter] = React.useState<string>("all");

  const markets = React.useMemo(() => {
    return Array.from(new Set(setups.map((s) => s.market).filter(Boolean))) as string[];
  }, [setups]);

  const [filteredSetups, setFilteredSetups] = React.useState<TradingSetup[]>(
    setups
  );

  // Filter-Logik im Dashboard (SetupFilters ist UI-only)
  React.useEffect(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const next = setups.filter((s) => {
      if (normalizedSearch) {
        const haystack = `${s.market ?? ""} ${s.setupLabel ?? ""} ${s.patternType ?? ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (marketFilter !== "all" && s.market !== marketFilter) return false;
      if (directionFilter !== "all" && s.direction !== directionFilter) return false;

      return true;
    });

    setFilteredSetups(next);
  }, [setups, search, marketFilter, directionFilter]);

  function resetSetupFilters() {
    setSearch("");
    setMarketFilter("all");
    setDirectionFilter("all");
  }

  const openSetups = filteredSetups.filter((s) =>
    ["open", "triggered", "entered"].includes(s.status)
  );

  const historySetups = filteredSetups.filter((s) =>
    ["completed", "missed", "invalidated"].includes(s.status)
  );

  // -----------------------------
  // Trade Filters (HOOK)
  // -----------------------------
  const tradeFilters = useTradeFilters({ trades });

  // -----------------------------
  // Trade Stats (für TradeStatsGrid Props)
  // -----------------------------
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const bes = trades.filter((t) => t.result === "BE").length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

  const totalPnL = trades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

  const rValues = trades
    .map((t: any) => t.rMultiple)
    .filter((r: any): r is number => typeof r === "number" && Number.isFinite(r));

  const avgR =
    rValues.length > 0
      ? Number((rValues.reduce((sum, r) => sum + r, 0) / rValues.length).toFixed(2))
      : 0;

  const bestR =
    rValues.length > 0 ? Number(Math.max(...rValues).toFixed(2)) : undefined;

  // -----------------------------
  // Handlers
  // -----------------------------
  function handleOpenEdit(setup: TradingSetup) {
    setEditingSetup(setup);
    setEditOpen(true);
  }

  function handleSetupSaved() {
    mutate();
    setEditOpen(false);
    setEditingSetup(null);
  }

  function handleOpenEditTrade(trade: TradeEntry) {
    setEditingTrade(trade);
    setTradeEditOpen(true);
  }

  function handleTradeSaved() {
    mutateTrades();
    setTradeEditOpen(false);
    setEditingTrade(null);
  }

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className={cn("space-y-4 px-4 pb-6 md:px-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Trading Dashboard (V2)
          </h2>
          <p className="text-xs text-muted-foreground">
            Setups planen, Trades loggen & dein Game auswerten.
          </p>
        </div>

        <Dialog open={newSetupOpen} onOpenChange={setNewSetupOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Neues Setup</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Neues Setup</DialogTitle>
            </DialogHeader>
            <SetupForm
              userId={userId}
              mode="create"
              onSuccess={() => {
                mutate();
                setNewSetupOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Setup Filters */}
      <SetupFilters setups={setups} onFilterChange={setFilteredSetups} />


      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="open">Setups</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="groups">Strategien</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ---------------- OPEN SETUPS ---------------- */}
        <TabsContent value="open" className="pt-4">
          {isLoading && <p className="text-xs">Lade Setups…</p>}
          {error && <p className="text-xs text-red-500">Fehler</p>}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {openSetups.map((setup) => (
              <SetupCard
                key={String(setup._id)}
                setup={setup}
                onEdit={handleOpenEdit}
                onOpenDetail={(s) => {
                  setDetailSetup(s);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* ---------------- HISTORY ---------------- */}
        <TabsContent value="history" className="pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {historySetups.map((setup) => (
              <SetupCard
                key={String(setup._id)}
                setup={setup}
                compact
                onEdit={handleOpenEdit}
                onOpenDetail={(s) => {
                  setDetailSetup(s);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* ---------------- TRADES ---------------- */}
        <TabsContent value="trades" className="space-y-4 pt-4">
          <TradeStatsGrid trades={trades} />


          <Card>
            <div className="p-4 flex gap-3">
              <input
                className="border rounded px-2 py-1 text-sm w-full"
                placeholder="Suche Trades…"
                value={tradeFilters.tradeSearch}
                onChange={(e) => tradeFilters.setTradeSearch(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={tradeFilters.resetTradeFilters}
              >
                Reset
              </Button>
            </div>
          </Card>

          {tradesLoading && <p className="text-xs">Lade Trades…</p>}
          {tradesError && <p className="text-xs text-red-500">Fehler</p>}

          <div className="space-y-2">
            {tradeFilters.filteredTrades.map((trade: any) => (
              <Card key={String(trade._id)} className="p-3 flex justify-between">
                <div className="text-sm">
                  {trade.symbol} – {trade.result}
                  {trade.accountName ? (
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      • {trade.accountName}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEditTrade(trade)}
                >
                  Bearbeiten
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ---------------- ACCOUNTS ---------------- */}
        <TabsContent value="accounts" className="pt-4">
          <AccountManager userId={userId} />
        </TabsContent>

        {/* ---------------- GROUPS ---------------- */}
        <TabsContent value="groups" className="pt-4">
          <TradeGroupManager userId={userId} />
        </TabsContent>
      </Tabs>

      {/* Edit Setup */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Edit Trade */}
      <Dialog open={tradeEditOpen} onOpenChange={setTradeEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      <SetupDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        setup={detailSetup}
      />
    </div>
  );
};

export default TradingSetupsDashboard;
