"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { TradingSetup } from "../interface";

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

import { SetupForm } from "./SetupForm";
import TradeFromSetupSheet from "./SetupSheet";

// --- Helper: SWR fetcher ---
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch setups");
    return res.json();
  });

interface TradingSetupsDashboardProps {
  userId: string;
  className?: string;
}

export const TradingSetupsDashboard: React.FC<
  TradingSetupsDashboardProps
> = ({ userId, className }) => {
  const [activeTab, setActiveTab] = React.useState<"open" | "history" | "stats">("open");
  const [search, setSearch] = React.useState("");
  const [marketFilter, setMarketFilter] = React.useState<string>("all");
  const [directionFilter, setDirectionFilter] = React.useState<string>("all");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingSetup, setEditingSetup] = React.useState<TradingSetup | null>(null);

  // 🔹 Neu: Sheet-State für „Trade aus Setup loggen“
  const [tradeSheetOpen, setTradeSheetOpen] = React.useState(false);
  const [tradeFromSetup, setTradeFromSetup] = React.useState<TradingSetup | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );

  const setups: TradingSetup[] = data?.setups ?? [];

  // ---- Filter-Logik ----
  const normalizedSearch = search.trim().toLowerCase();

  const filteredSetups = setups.filter((s) => {
    if (normalizedSearch) {
      const haystack = `${s.market ?? ""} ${s.setupLabel ?? ""} ${
        s.patternType ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (marketFilter !== "all" && s.market !== marketFilter) return false;
    if (directionFilter !== "all" && s.direction !== directionFilter) return false;

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

  // --- einfache Stats ---
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

  // 🔹 Neu: Handler, um das Trade-Sheet zu öffnen
  function handleOpenTradeFromSetup(setup: TradingSetup) {
    setTradeFromSetup(setup);
    setTradeSheetOpen(true);
  }

  function handleSetupSaved() {
    mutate(); // neu laden
    setCreateOpen(false);
    setEditOpen(false);
    setEditingSetup(null);
  }

  const uniqueMarkets = Array.from(
    new Set(setups.map((s) => s.market).filter(Boolean))
  );

  return (
    <div className={cn("space-y-4 px-4 pb-6 md:px-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Setup-Board (V2)
          </h2>
          <p className="text-xs text-muted-foreground">
            Plane, tracke und reflektiere deine Swings – getrennt von einzelnen Trades.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ Neues Setup</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Neues Setup anlegen</DialogTitle>
            </DialogHeader>
            <SetupForm
              userId={userId}
              mode="create"
              onSuccess={handleSetupSaved}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
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

              <Select
                value={marketFilter}
                onValueChange={setMarketFilter}
              >
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="open">Open / Aktiv</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* Tab: Open */}
        <TabsContent value="open" className="pt-4 space-y-4">
          {isLoading && <p className="text-xs text-muted-foreground">Lade Setups...</p>}
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
                  onCreateTradeFromSetup={handleOpenTradeFromSetup}
                />
              ))}

              {activeSetups.map((setup) => (
                <SetupCard
                  key={setup._id as string}
                  setup={setup}
                  onEdit={handleOpenEdit}
                  onCreateTradeFromSetup={handleOpenTradeFromSetup}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: History */}
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
                  compact
                  onCreateTradeFromSetup={handleOpenTradeFromSetup}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Stats */}
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
                  Wie oft du ein Setup mit Decision tatsächlich gespielt hast (entered)
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit-Dialog */}
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

      {/* Trade aus Setup loggen – Sheet */}
      <TradeFromSetupSheet
        userId={userId}
        setup={tradeFromSetup}
        open={tradeSheetOpen}
        onOpenChange={setTradeSheetOpen}
        onSaved={() => {
          mutate();
        }}
      />
    </div>
  );
};

// --- Kleine Setup-Card direkt hier im selben File ---
interface SetupCardProps {
  setup: TradingSetup;
  onEdit: (setup: TradingSetup) => void;
  compact?: boolean;
  onCreateTradeFromSetup?: (setup: TradingSetup) => void;
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
  compact,
  onCreateTradeFromSetup,
}) => {
  const statusVariant =
    statusVariantMap[setup.status] ?? "outline";

  const created = setup.createdAt
    ? new Date(setup.createdAt as string).toLocaleDateString()
    : undefined;

  return (
    <Card className={cn("flex flex-col justify-between", compact && "opacity-80")}>
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
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
          <p className="text-xs text-muted-foreground">{setup.patternType}</p>
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

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(setup)}
          >
            Bearbeiten
          </Button>

          {onCreateTradeFromSetup && (
            <Button
              size="sm"
              onClick={() => onCreateTradeFromSetup(setup)}
            >
              Trade loggen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingSetupsDashboard;

