"use client";

import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Account } from "@/utils/interface";

type StatsData = {
  count: number;
  winrate: number;
  avgPnl: number;
  avgRating: number;
  history?: { day: string; count: number; pnl?: number }[];
};

type Trade = {
  _id: string;
  date: string;
  pnl?: number;
  strategy?: string;
  strategy_name?: string;
  accountId?: string;
  result?: "win" | "loss" | "BE";
  symbol?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function daysAgo(n: number, d = new Date()) {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  copy.setUTCDate(copy.getUTCDate() - n);
  return copy.toISOString().slice(0, 10);
}
function today() {
  const d = new Date();
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  return copy.toISOString().slice(0, 10);
}
function currencySymbol(cur?: string) {
  if (!cur) return "";
  const c = cur.toUpperCase();
  if (c === "EUR" || c === "€") return "€";
  if (c === "USD" || c === "$") return "$";
  if (c === "GBP" || c === "£") return "£";
  return c;
}

type AccountEx = Account & {
  currentBalance?: number;
  startingBalance?: number;
  realizedPnl?: number;
};

export default function AccountOverviewCard({ userId }: { userId: string }) {
  const { mutate } = useSWRConfig();
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [showDetails, setShowDetails] = React.useState(false);

  // Deposit/Withdrawal UI state
  const [adjKind, setAdjKind] = React.useState<"deposit"|"withdrawal">("deposit");
  const [adjAmount, setAdjAmount] = React.useState<string>("");
  const [adjNote, setAdjNote] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setAccountId(url.searchParams.get("account") || undefined);
      setShowDetails((url.searchParams.get("details") || "") === "open");
    } catch {}
    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    window.addEventListener("account-change", onAccount as EventListener);
    return () => window.removeEventListener("account-change", onAccount as EventListener);
  }, []);

  const { data: accData } = useSWR<{ accounts: AccountEx[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = accData?.accounts ?? [];
  const acc = accounts.find((a) => a._id === accountId);
  const curSymbol = currencySymbol(acc?.currency || (acc?.name?.toLowerCase().includes("eur") ? "EUR" : undefined));

  const qsWeek = React.useMemo(() => {
    if (!userId) return null;
    const parts = [`range=week`, `userId=${encodeURIComponent(userId)}`];
    if (accountId) parts.push(`accountId=${encodeURIComponent(accountId)}`);
    return `/api/trading/getStats?${parts.join("&")}`;
  }, [userId, accountId]);
  const qsMonth = React.useMemo(() => {
    if (!userId) return null;
    const parts = [`range=month`, `userId=${encodeURIComponent(userId)}`];
    if (accountId) parts.push(`accountId=${encodeURIComponent(accountId)}`);
    return `/api/trading/getStats?${parts.join("&")}`;
  }, [userId, accountId]);

  const { data: weekStats } = useSWR<StatsData>(qsWeek, fetcher);
  const { data: monthStats } = useSWR<StatsData>(qsMonth, fetcher);

  const recentKey = React.useMemo(() => {
    if (!userId) return null;
    const from = daysAgo(90);
    const to = today();
    const parts = [`userId=${encodeURIComponent(userId)}`, `from=${from}`, `to=${to}`, `limit=1000`];
    if (accountId) parts.push(`accountId=${encodeURIComponent(accountId)}`);
    return `/api/trading/getRecent?${parts.join("&")}`;
  }, [userId, accountId]);
  const { data: recentData, isLoading, error } = useSWR<{ trades: Trade[] }>(recentKey, fetcher);

  const best = React.useMemo(() => {
    const trades = recentData?.trades ?? [];
    if (!trades.length) return null;
    type Agg = { pnl: number; count: number; wins: number };
    const map = new Map<string, Agg>();
    for (const t of trades) {
      const name = (t.strategy_name || t.strategy || "(keine)").trim();
      const key = name || "(keine)";
      const pnl = Number(t.pnl ?? 0);
      const prev = map.get(key) ?? { pnl: 0, count: 0, wins: 0 };
      map.set(key, {
        pnl: prev.pnl + (Number.isFinite(pnl) ? pnl : 0),
        count: prev.count + 1,
        wins: prev.wins + (t.result === "win" ? 1 : 0),
      });
    }
    const arr = Array.from(map.entries()).map(([name, a]) => ({
      name,
      pnl: a.pnl,
      count: a.count,
      winrate: a.count ? a.wins / a.count : 0,
    }));
    const qualified = arr.filter((x) => x.count >= 3);
    const pool = qualified.length ? qualified : arr;
    pool.sort((a, b) => b.pnl - a.pnl);
    return pool[0] ?? null;
  }, [recentData?.trades]);

  const weekTotal = weekStats ? weekStats.avgPnl * weekStats.count : 0;
  const monthTotal = monthStats ? monthStats.avgPnl * monthStats.count : 0;
  const fmtPnL = (n: number) => {
    if (!Number.isFinite(n)) return "–";
    const val = n.toFixed(2);
    return curSymbol ? `${val}${curSymbol}` : val;
  };
  const fmtPct = (n: number) => `${Math.round((n || 0) * 100)}%`;

  const toggleDetails = () => {
    setShowDetails((prev) => {
      const next = !prev;
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("details", next ? "open" : "closed");
        window.history.replaceState({}, "", url.toString());
      } catch {}
      return next;
    });
  };

  const recentRows = (recentData?.trades ?? []).slice(0, 20);

  async function performAdjustment() {
    if (!userId || !accountId) return;
    const amt = Number(adjAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Bitte einen Betrag > 0 eingeben.");
      return;
    }
    const payload = { userId, accountId, amount: amt, kind: adjKind, note: adjNote || undefined };
    const res = await fetch("/api/trading/account/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Konnte ${adjKind === "deposit" ? "Einzahlung" : "Auszahlung"} nicht speichern:\n${t}`);
      return;
    }
    setAdjAmount("");
    setAdjNote("");
    // SWR revalidieren
    const prefix = `/api/trading/getAllAccounts?userId=${userId}`;
    await Promise.all([
      mutate((key) => typeof key === "string" && key.startsWith(prefix)),
      mutate(prefix),
    ]);
  }

  async function deleteAccount() {
    if (!userId || !accountId) return;
    // 3x Confirm
    if (!window.confirm("Account wirklich löschen?")) return;
    if (!window.confirm("Sicher? Dieser Vorgang kann nicht rückgängig gemacht werden.")) return;
    if (!window.confirm("Letzte Bestätigung: Account löschen?")) return;

    const res = await fetch(`/api/trading/account/delete?userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(accountId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Konnte Account nicht löschen:\n${t}`);
      return;
    }
    // URL bereinigen & SWR revalidieren
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("account");
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("accounts-refresh"));
      window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId: undefined } }));
    } catch {}
    const prefix = `/api/trading/getAllAccounts?userId=${userId}`;
    await Promise.all([
      mutate((key) => typeof key === "string" && key.startsWith(prefix)),
      mutate(prefix),
    ]);
  }

  const balanceBox = (
    <div className="rounded-md border p-3 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm text-muted-foreground">Aktueller Kontostand</div>
        <div className="text-lg font-semibold">
          {fmtPnL(Number(acc?.currentBalance ?? acc?.startingBalance ?? 0))}
        </div>
        <div className="text-xs text-muted-foreground">
          Realized PnL: {fmtPnL(Number(acc?.realizedPnl ?? 0))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={adjKind}
          onChange={(e) => setAdjKind(e.target.value as any)}
        >
          <option value="deposit">Einzahlung</option>
          <option value="withdrawal">Auszahlung</option>
        </select>
        <Input
          className="w-32"
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="Betrag"
          value={adjAmount}
          onChange={(e) => setAdjAmount(e.target.value)}
        />
        <Textarea
          className="w-44"
          placeholder="Notiz (optional)"
          value={adjNote}
          onChange={(e) => setAdjNote(e.target.value)}
        />
        <Button variant="secondary" size="sm" onClick={performAdjustment}>
          Speichern
        </Button>
        <Button variant="destructive" size="sm" onClick={deleteAccount}>
          Account löschen
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Account Überblick</CardTitle>
            <CardDescription>
              {acc ? `${acc.name || "Account"} • Währung: ${acc.currency || "—"}` : "Wähle einen Account (oben rechts / via StrategyPills)."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {acc ? <Badge variant="outline">{acc._id}</Badge> : null}
            {curSymbol ? <Badge variant="secondary">Currency: {curSymbol}</Badge> : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Kontostand + Aktionen */}
        {acc ? balanceBox : null}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Trades (Woche)</div>
            <div className="text-xl font-semibold">{weekStats?.count ?? 0}</div>
            <div className="text-xs">Winrate: {fmtPct(weekStats?.winrate ?? 0)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">PnL (Woche)</div>
            <div className={`text-xl font-semibold ${weekStats && weekStats.avgPnl * weekStats.count < 0 ? "text-rose-600" : ""}`}>
              {fmtPnL(weekStats ? weekStats.avgPnl * weekStats.count : 0)}
            </div>
            <div className="text-xs">Ø/Trade: {fmtPnL(weekStats?.avgPnl ?? 0)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">Trades (Monat)</div>
            <div className="text-xl font-semibold">{monthStats?.count ?? 0}</div>
            <div className="text-xs">Winrate: {fmtPct(monthStats?.winrate ?? 0)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-sm text-muted-foreground">PnL (Monat)</div>
            <div className={`text-xl font-semibold ${monthStats && monthStats.avgPnl * monthStats.count < 0 ? "text-rose-600" : ""}`}>
              {fmtPnL(monthStats ? monthStats.avgPnl * monthStats.count : 0)}
            </div>
            <div className="text-xs">Ø/Trade: {fmtPnL(monthStats?.avgPnl ?? 0)}</div>
          </div>
        </div>

        <Separator />

        {/* Beste Strategie */}
        <div className="rounded-md border p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Beste Strategie (letzte 90 Tage)</div>
            <div className="text-lg font-semibold">
              {best ? best.name : isLoading ? "Lade…" : "—"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Trades: {best?.count ?? 0}</Badge>
            <Badge variant="outline">Winrate: {fmtPct(best?.winrate ?? 0)}</Badge>
            <Badge variant={best && best.pnl >= 0 ? "secondary" : "outline"}>
              PnL: {fmtPnL(best?.pnl ?? 0)}
            </Badge>
          </div>
        </div>

        {error && <div className="text-red-600">Fehler beim Laden von Recent Trades.</div>}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const url = new URL(window.location.href);
              if (accountId) url.searchParams.set("account", accountId);
              window.history.replaceState({}, "", url.toString());
              window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId } }));
            }}
          >
            Filter fixieren
          </Button>
          <Button
            variant={showDetails ? "secondary" : "outline"}
            size="sm"
            onClick={toggleDetails}
            aria-expanded={showDetails}
            aria-controls="account-details"
          >
            {showDetails ? "Details schließen" : "Details öffnen"}
          </Button>
        </div>

        {/* Details Section */}
        <div
          id="account-details"
          className={`overflow-hidden transition-all duration-300 ease-in-out ${showDetails ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"}`}
          aria-hidden={!showDetails}
        >
          <div className="mt-4 space-y-4">
            {/* Letzte Trades */}
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Letzte Trades (max. 20)</div>
              {!recentRows.length ? (
                <div className="text-sm opacity-70">{isLoading ? "Lade…" : "Keine Trades gefunden."}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-3">Datum</th>
                        <th className="py-2 pr-3">Symbol</th>
                        <th className="py-2 pr-3">Strategie</th>
                        <th className="py-2 pr-3">Ergebnis</th>
                        <th className="py-2 pr-0 text-right">PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((t) => {
                        const sName = (t.strategy_name || t.strategy || "").trim();
                        const pnl = Number(t.pnl ?? 0);
                        return (
                          <tr key={t._id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-mono">{(t.date || "").slice(0, 10)}</td>
                            <td className="py-2 pr-3">{t.symbol || "—"}</td>
                            <td className="py-2 pr-3">{sName || "—"}</td>
                            <td className="py-2 pr-3">{t.result || "—"}</td>
                            <td className={`py-2 pr-0 text-right ${pnl >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                              {fmtPnL(pnl)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
