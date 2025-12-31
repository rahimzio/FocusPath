// components/trading1/trades/TradeJournalDashboard.tsx
"use client";

import * as React from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import type { TradeEntry } from "../interface";
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
  DialogTrigger,
} from "@/components/ui/dialog";

import { TradeEntryForm } from "./TradeEntryForm";

// --- Helper: SWR fetcher ---
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch trades");
    return res.json();
  });

interface TradeJournalDashboardProps {
  userId: string;
  className?: string;
}

export const TradeJournalDashboard: React.FC<TradeJournalDashboardProps> = ({
  userId,
  className,
}) => {
  const [search, setSearch] = React.useState("");
  const [resultFilter, setResultFilter] = React.useState<
    "all" | "win" | "loss" | "BE"
  >("all");

  const [editOpen, setEditOpen] = React.useState(false);
  const [editingTrade, setEditingTrade] = React.useState<TradeEntry | null>(
    null
  );

  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const trades: TradeEntry[] = data?.trades ?? [];

  // ---- Filter-Logik ----
  const normalizedSearch = search.trim().toLowerCase();

  const filteredTrades = trades.filter((t) => {
    if (normalizedSearch) {
      const haystack = `${t.symbol ?? ""} ${t.setup ?? ""} ${
        t.tags?.join(" ") ?? ""
      }`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    if (resultFilter !== "all" && t.result !== resultFilter) return false;

    return true;
  });

  // --- einfache Stats ---
  const total = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const beCount = trades.filter((t) => t.result === "BE").length;
  const winRate =
    total > 0 ? Math.round((wins / (wins + losses + beCount)) * 100) : 0;
  const netPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const avgRating =
    total > 0
      ? Math.round(
          (trades.reduce((sum, t) => sum + (t.rating ?? 0), 0) / total) * 10
        ) / 10
      : 0;

  function handleOpenEdit(trade: TradeEntry) {
    setEditingTrade(trade);
    setEditOpen(true);
  }

  function handleTradeSaved() {
    mutate();
    setEditOpen(false);
    setEditingTrade(null);
  }

  const uniqueSymbols = Array.from(
    new Set(trades.map((t) => t.symbol).filter(Boolean))
  );

  return (
    <div className={cn("space-y-4 px-4 pb-6 md:px-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Trade-Journal (V2)
          </h2>
          <p className="text-xs text-muted-foreground">
            Logge deine Trades, verknüpfe sie mit Setups und tracke dein
            Mental Game.
          </p>
        </div>

        {/* Neuer Trade-Dialog (uncontrolled) */}
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">+ Neuer Trade</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Neuen Trade anlegen</DialogTitle>
            </DialogHeader>
            <TradeEntryForm
              userId={userId}
              mode="create"
              onSuccess={handleTradeSaved}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter + Stats-Kurzfassung */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Filter */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <Input
                placeholder="Suche nach Symbol / Setup / Tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="md:max-w-xs"
              />

              <Select
                value={resultFilter}
                onValueChange={(v) =>
                  setResultFilter(v as "all" | "win" | "loss" | "BE")
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
                onValueChange={(val) => {
                  if (val === "all") {
                    setSearch((prev) => prev); // nichts
                  } else {
                    setSearch(val);
                  }
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Symbole</SelectItem>
                  {uniqueSymbols.map((s) => (
                    <SelectItem key={s} value={s!}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setResultFilter("all");
              }}
            >
              Filter zurücksetzen
            </Button>
          </div>

          {/* Mini-Stats */}
          <div className="grid gap-3 md:grid-cols-4 text-xs">
            <div>
              <p className="text-muted-foreground">Trades gesamt</p>
              <p className="text-lg font-semibold">{total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Winrate</p>
              <p className="text-lg font-semibold">{winRate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Netto PnL</p>
              <p className="text-lg font-semibold">
                {netPnL.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Ø Rating</p>
              <p className="text-lg font-semibold">{avgRating}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trades-Grid */}
      {isLoading && (
        <p className="text-xs text-muted-foreground">Trades werden geladen...</p>
      )}
      {error && (
        <p className="text-xs text-destructive">
          Fehler beim Laden der Trades.
        </p>
      )}

      {!isLoading && !error && (
        <>
          {filteredTrades.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Noch keine Trades im Journal oder Filter zu streng.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredTrades.map((trade) => (
                <TradeCard
                  key={trade._id as string}
                  trade={trade}
                  onEdit={handleOpenEdit}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Edit-Dialog */}
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
    </div>
  );
};

// --- Kleine Trade-Card direkt hier im selben File ---
interface TradeCardProps {
  trade: TradeEntry;
  onEdit: (trade: TradeEntry) => void;
}

const resultVariantMap: Record<
  TradeEntry["result"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  win: "default",
  loss: "destructive",
  BE: "secondary",
};

const TradeCard: React.FC<TradeCardProps> = ({ trade, onEdit }) => {
  const createdDate = trade.date
    ? new Date(trade.date).toLocaleDateString()
    : undefined;

  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {trade.symbol} – {trade.setupId || "ohne Setup-Name"}
          </CardTitle>
          <Badge
            variant={ "outline"}
            className="text-[10px] uppercase"
          >
            {trade.result}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {createdDate && <span>{createdDate}</span>}
          {typeof trade.pnl === "number" && (
            <span
              className={cn(
                trade.pnl > 0 ? "text-emerald-500" : "",
                trade.pnl < 0 ? "text-red-500" : ""
              )}
            >
              PnL: {trade.pnl.toFixed(2)}
            </span>
          )}
          {trade.rating != null && <span>Rating: {trade.rating}/10</span>}
          {trade.gameGrade && <span>Game: {trade.gameGrade}</span>}
        </div>
        {trade.tags && trade.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {trade.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-4">
        {trade.notes && (
          <p className="line-clamp-3 text-xs text-muted-foreground">
            {trade.notes}
          </p>
        )}

        {trade.screenshotUrl && (
          <a
            href={trade.screenshotUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] underline text-muted-foreground"
          >
            Screenshot öffnen
          </a>
        )}

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(trade)}
          >
            Bearbeiten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeJournalDashboard;
