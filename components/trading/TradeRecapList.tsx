"use client";

import { useState } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import TradeEntryForm from "./TradeEntryForm";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Account, TradeEntry } from "@/utils/interface";
interface TradeRecapListProps {
  userId: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Hilfsfunktion für sauberes Formatieren
function fmt(num: number | string | undefined, digits: number) {
  const n = Number(num);
  return isNaN(n) ? (0).toFixed(digits) : n.toFixed(digits);
}

export default function TradeRecapList({ userId }: TradeRecapListProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [symbol, setSymbol] = useState("");
  const [account, setAccount] = useState("all");

  const { data: accountData } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = accountData?.accounts || [];
  const accountMap = accounts.reduce(
    (acc, cur) => ({ ...acc, [cur._id || ""]: cur.name }),
    {} as Record<string, string>
  );

const { data, mutate } = useSWR<{ trades: TradeEntry[] }>(
  userId ? `/api/trading/getRecent?userId=${userId}` : null,
  fetcher
);
  const trades: TradeEntry[] = data?.trades || [];
  const filtered = symbol
    ? trades.filter((t) =>
      t.symbol?.toLowerCase().includes(symbol.toLowerCase())
    )
    : trades;

  const totalPnl = filtered.reduce(
    (sum: number, t: TradeEntry) => sum + (t.pnl || 0),
    0
  );
  const wins = filtered.filter((t) => t.result === "win").length;
  const winrate = filtered.length ? (wins / filtered.length) * 100 : 0;

  // State für ausgewählten Trade und Dialog
  const [selectedTrade, setSelectedTrade] = useState<TradeEntry | null>(null);
  const [open, setOpen] = useState(false);

  const handleRowClick = (trade: TradeEntry) => {
    setSelectedTrade(trade);
    setOpen(true);
  };

  const onEdited = async () => {
    setOpen(false);
    await mutate();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Trade Recap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="max-w-[200px]"
            />
            <Input
              placeholder="Symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="sm:max-w-[150px]"
            />            <Select value={account} onValueChange={setAccount}>
              <SelectTrigger className="sm:max-w-[150px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id!}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Ergebnis</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>A/B/C</TableHead>
                <TableHead>Emotion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t._id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleRowClick(t)}>
                  <TableCell>{t.date}</TableCell>
                  <TableCell>{accountMap[t.accountId || ""] || "-"}</TableCell>
                  <TableCell>{t.symbol}</TableCell>
                  <TableCell>{t.result}</TableCell>
                  <TableCell>{fmt(t.pnl, 2)}</TableCell>
                  <TableCell>{t.rating}</TableCell>
                  <TableCell>{t.emotionBefore}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Keine Trades
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex gap-4 text-sm">
            <span>Gesamt PnL: {fmt(totalPnl, 2)} €</span>
            <span>Winrate: {fmt(winrate, 1)} %</span>
          </div>
        </CardContent>
      </Card>

      {/* Detail-/Edit-Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Trade Details</DialogTitle>
          </DialogHeader>

          {selectedTrade && (
            // Reuse TradeEntryForm for Editing: erwartet nun optional initialData prop
            <TradeEntryForm
              {...selectedTrade}
              userId={userId}
              onCreated={onEdited}
              initialData={selectedTrade}
            />
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
