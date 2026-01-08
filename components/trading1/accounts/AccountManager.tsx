"use client";

import * as React from "react";
import useSWR from "swr";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { TradeEntry } from "../interface";
import AddAccountModal from "./AddAccountModal";

type TradingAccountLite = {
  _id?: string;
  userId?: string;
  name: string;
  currency?: string;
  startCapital?: number;
  riskPerTrade?: number;
  isActive?: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

interface AccountManagerProps {
  userId: string;
  onSelectRecapAccountId?: (accountId: string) => void; // "In Recap filtern"
}

export default function AccountManager({ userId, onSelectRecapAccountId }: AccountManagerProps) {
  const { data, mutate, isLoading, error } = useSWR(
    userId ? `/api/trading/accounts/list?userId=${userId}` : null,
    fetcher
  );

  const { data: tradesData } = useSWR(
    userId ? `/api/trading/trades/list?userId=${userId}` : null,
    fetcher
  );

  const accounts: TradingAccountLite[] = data?.accounts ?? [];
  const trades: TradeEntry[] = tradesData?.trades ?? [];

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<TradingAccountLite | null>(null);

  const openDetails = (acc: TradingAccountLite) => {
    setSelectedAccount(acc);
    setDetailOpen(true);
  };

  const accountStats = React.useMemo(() => {
    const byId = new Map<string, any>();

    for (const acc of accounts) {
      const id = String(acc._id ?? acc.name);
      const accTrades = trades.filter((t: any) => {
        const tAccId = t.accountId ? String(t.accountId) : "";
        const tAccName = t.accountName ? String(t.accountName) : "";
        return (tAccId && tAccId === String(acc._id)) || (tAccName && tAccName === acc.name);
      });

      const totalTrades = accTrades.length;
      const wins = accTrades.filter((t) => t.result === "win").length;
      const losses = accTrades.filter((t) => t.result === "loss").length;
      const bes = accTrades.filter((t) => t.result === "BE").length;

      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
      const realizedPnL = accTrades.reduce((sum, t: any) => sum + safeNum(t.pnl), 0);
      const avgPnL = totalTrades > 0 ? realizedPnL / totalTrades : 0;

      const startCapital = safeNum(acc.startCapital);
      const balance = startCapital + realizedPnL;

      byId.set(id, {
        totalTrades,
        wins,
        losses,
        bes,
        winRate,
        realizedPnL,
        avgPnL,
        balance,
      });
    }

    return byId;
  }, [accounts, trades]);

  const selectedStats = selectedAccount
    ? accountStats.get(String(selectedAccount._id ?? selectedAccount.name))
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Accounts</h3>
          <p className="text-xs text-muted-foreground">
            Erstelle Accounts und sieh deine Performance pro Konto.
          </p>
        </div>

        <AddAccountModal userId={userId} onCreated={() => mutate()} />
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Lade Accounts...</p>}
      {error && <p className="text-xs text-destructive">Fehler beim Laden der Accounts.</p>}

      {!isLoading && !error && accounts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Noch keine Accounts. Erstelle deinen ersten Account.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((acc) => {
          const stats = accountStats.get(String(acc._id ?? acc.name));
          return (
            <Card key={String(acc._id ?? acc.name)} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {acc.currency ?? "—"} • Start: {safeNum(acc.startCapital).toFixed(2)}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDetails(acc)}>
                  Details
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Kontostand</p>
                  <p className="font-medium">{stats ? stats.balance.toFixed(2) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Realized PnL</p>
                  <p className="font-medium">{stats ? stats.realizedPnL.toFixed(2) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trades</p>
                  <p className="font-medium">{stats ? stats.totalTrades : 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Winrate</p>
                  <p className="font-medium">{stats ? `${stats.winRate}%` : "—"}</p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Risiko/Trade: {safeNum(acc.riskPerTrade).toString()} • Aktiv:{" "}
                {acc.isActive === false ? "nein" : "ja"}
              </p>

              {onSelectRecapAccountId && acc._id && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => onSelectRecapAccountId(String(acc._id))}
                >
                  In Recap filtern
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
          </DialogHeader>

          {!selectedAccount ? (
            <p className="text-xs text-muted-foreground">Kein Account gewählt.</p>
          ) : (
            <div className="space-y-3">
              <Card className="p-4 space-y-2">
                <p className="text-sm font-semibold">{selectedAccount.name}</p>
                <p className="text-xs text-muted-foreground">
                  Währung: {selectedAccount.currency ?? "—"}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Startkapital</p>
                    <p className="font-medium">{safeNum(selectedAccount.startCapital).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Kontostand</p>
                    <p className="font-medium">{selectedStats ? selectedStats.balance.toFixed(2) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Realized PnL</p>
                    <p className="font-medium">{selectedStats ? selectedStats.realizedPnL.toFixed(2) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ø PnL / Trade</p>
                    <p className="font-medium">{selectedStats ? selectedStats.avgPnL.toFixed(2) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trades</p>
                    <p className="font-medium">{selectedStats ? selectedStats.totalTrades : 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Winrate</p>
                    <p className="font-medium">{selectedStats ? `${selectedStats.winRate}%` : "—"}</p>
                  </div>
                </div>
              </Card>

              {onSelectRecapAccountId && selectedAccount._id && (
                <Button
                  className="w-full"
                  onClick={() => onSelectRecapAccountId(String(selectedAccount._id))}
                >
                  In Recap filtern
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
