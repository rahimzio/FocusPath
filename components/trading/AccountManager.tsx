"use client";

import * as React from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* 🔹 Dialog-UI (shadcn) */
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type Props = { userId: string };

type Account = {
  _id: string;
  name?: string;
  broker?: string;
  currency?: string;
  startingBalance?: number;
  /** 🔹 Neu: vom Backend mitliefern (Projection anpassen) */
  currentBalance?: number;
  /** 🔹 Optional */
  realizedPnl?: number;
  riskPerTrade?: number;
  createdAt?: string;
};

type StatsData = {
  count: number;
  winrate: number; // 0..1
  avgPnl: number;
  avgRating?: number;
};

function formatMoney(n?: number, ccy?: string) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  const val = Math.round(n * 100) / 100;
  return `${val.toLocaleString()}${ccy ? " " + ccy : ""}`;
}

function useUrlRange() {
  const [range, setRange] = React.useState<"week" | "month" | "all">("month");
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const r = url.searchParams.get("range");
      if (r === "week" || r === "month" || r === "all") setRange(r);
    } catch {}
  }, []);
  return range;
}

function AccountQuickStats({
  userId,
  accountId,
  currency,
}: {
  userId: string;
  accountId: string;
  currency?: string;
}) {
  const range = useUrlRange();
  const qs = `range=${range}&userId=${encodeURIComponent(
    userId
  )}&accountId=${encodeURIComponent(accountId)}`;
  const { data, error } = useSWR<StatsData>(`/api/trading/getStats?${qs}`, fetcher);

  if (error) return null;
  if (!data) {
    return (
      <div className="text-xs opacity-60 min-w-0">
        Lade {range === "week" ? "7-Tage" : range === "all" ? "Gesamt" : "Monats"}-Stats…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3 text-sm w-full max-w-full min-w-0">
      <div className="min-w-0">
        <div className="opacity-60">Trades</div>
        <div className="font-medium tabular-nums">{data.count}</div>
      </div>
      <div className="min-w-0">
        <div className="opacity-60">Winrate</div>
        <div className="font-medium tabular-nums">
          {Math.round((data.winrate ?? 0) * 100)}%
        </div>
      </div>
      <div className="min-w-0">
        <div className="opacity-60">Ø PnL</div>
        <div className="font-medium tabular-nums truncate">
          {formatMoney(data.avgPnl, currency)}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   🔹 NEU: Inline-Komponente AccountAdjustButton
   - Button in jeder Karte
   - Dialog mit Auswahl „Einzahlung/Auszahlung“, Betrag, Notiz
   - POST an /api/trading/account/adjust
   - Mutate refresht Account-Cache + Events auslösen
------------------------------------------------------- */
function AccountAdjustButton({
  userId,
  accountId,
  currency,
  triggerVariant = "secondary",
}: {
  userId: string;
  accountId: string;
  currency?: string;
  triggerVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | "destructive";
}) {
  const { mutate } = useSWRConfig();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");

  const disabled = !userId || !accountId;

  const reset = () => {
    setKind("deposit");
    setAmount("");
    setNote("");
  };

  async function save() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Bitte einen Betrag größer 0 eingeben.");
      return;
    }
    if (!userId || !accountId) {
      alert("Fehlende ID: userId oder accountId.");
      return;
    }

    const res = await fetch("/api/trading/account/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        accountId,                // ← wichtig: das _id des Accounts unverändert weitergeben
        amount: amt,
        kind,
        note: note?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Konnte ${kind === "deposit" ? "Einzahlung" : "Auszahlung"} nicht speichern:\n${t}`);
      return;
    }

    // Cache aller Account-Queries aktualisieren
    const prefix = `/api/trading/getAllAccounts?userId=${userId}`;
    await Promise.all([
      mutate((key) => typeof key === "string" && key.startsWith(prefix)),
      mutate(prefix),
    ]);

    // Globale Events auslösen (sofern andere Komponenten zuhören)
    try {
      window.dispatchEvent(new CustomEvent("accounts-refresh"));
      window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId } }));
    } catch {}

    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="whitespace-nowrap" disabled={disabled}>
          Ein-/Auszahlung
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ein- / Auszahlung erfassen</DialogTitle>
          <DialogDescription>
            Buche eine Einzahlung oder Auszahlung für dieses Konto. Diese Anpassungen
            beeinflussen nicht deine Trade-PnLs, sondern nur den Kontostand.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label htmlFor="kind">Art</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={kind === "deposit" ? "default" : "outline"}
                onClick={() => setKind("deposit")}
              >
                Einzahlung
              </Button>
              <Button
                type="button"
                variant={kind === "withdrawal" ? "default" : "outline"}
                onClick={() => setKind("withdrawal")}
              >
                Auszahlung
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Betrag {currency ? `(${currency})` : ""}</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder={`z. B. 1000${currency ? ` ${currency}` : ""}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Notiz (optional)</Label>
            <Textarea
              id="note"
              placeholder="z. B. Einlage vom Referenzkonto"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
        <Button onClick={save} disabled={disabled}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountManager({ userId }: Props) {
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = data?.accounts ?? [];

  // Auf globale Refresh-Events hören (z.B. nach Ein-/Auszahlung)
  React.useEffect(() => {
    const handler = () => {
      const key = `/api/trading/getAllAccounts?userId=${userId}`;
      mutate((k) => typeof k === "string" && k.startsWith(key));
      mutate(key);
    };
    window.addEventListener("accounts-refresh", handler as EventListener);
    return () => window.removeEventListener("accounts-refresh", handler as EventListener);
  }, [mutate, userId]);

  // Aktive Auswahl über URL syncen
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const acc = url.searchParams.get("account");
      setSelectedId(acc);
      if (acc) {
        window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId: acc } }));
      }
    } catch {}
  }, []);

  const updateUrlAndEmit = (accId: string | null) => {
    try {
      const url = new URL(window.location.href);
      if (accId) url.searchParams.set("account", accId);
      else url.searchParams.delete("account");
      window.history.replaceState({}, "", url.toString());
    } catch {}
    window.dispatchEvent(new CustomEvent("account-change", { detail: { accountId: accId } }));
  };

  const onFilterRecap = (acc?: Account | null) => {
    const next = acc?._id ?? null;
    setSelectedId(next);
    updateUrlAndEmit(next);
  };

  if (error) return <div className="text-red-600">Konten konnten nicht geladen werden.</div>;

  return (
    <div className="space-y-4 w-full max-w-full min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <h2 className="text-xl font-semibold truncate">Accounts</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedId ? "outline" : "default"}
            onClick={() => onFilterRecap(null)}
            aria-pressed={!selectedId}
            title="Recap & Charts: alle Accounts"
            className="whitespace-nowrap"
          >
            Alle Accounts
          </Button>
        </div>
      </div>

      {isLoading && <div className="opacity-60">Lade Konten…</div>}

      {!isLoading && accounts.length === 0 && (
        <Card className="w-full max-w-full min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="truncate">Kein Account vorhanden</CardTitle>
          </CardHeader>
          <CardContent className="text-sm opacity-70">
            Lege einen Account an, inkl. Währung & Startkapital.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full max-w-full min-w-0">
        {accounts.map((a) => {
          const isActive = selectedId === a._id;
          const title = a.name || a._id;

          // 🔹 Anzeige-Betrag: currentBalance -> startingBalance -> —
          const balanceDisplay =
            a.currentBalance !== undefined
              ? a.currentBalance
              : a.startingBalance !== undefined
              ? a.startingBalance
              : undefined;

          return (
            <Card
              key={a._id}
              className={cn(
                "flex flex-col transition-colors w-full max-w-full min-w-0 overflow-hidden",
                isActive ? "border-primary ring-1 ring-primary/40" : ""
              )}
              data-selected={isActive ? "true" : "false"}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2 w-full max-w-full min-w-0">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{title}</CardTitle>
                  <div className="text-xs opacity-60 truncate">
                    {a.broker ? `Broker: ${a.broker}` : "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{a.currency || "—"}</Badge>
                    {isActive && <Badge className="bg-primary text-white">Aktiv</Badge>}
                  </div>
                  {a.createdAt ? (
                    <div className="text-[10px] opacity-60 whitespace-nowrap">
                      seit {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 w-full max-w-full min-w-0">
                {/* 🔹 Aktueller Kontostand + optional RealizedPnL */}
                <div className="rounded-md border p-3 flex items-center justify-between gap-3 w-full max-w-full min-w-0">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Kontostand</div>
                    <div className="text-lg font-semibold">
                      {formatMoney(balanceDisplay, a.currency)}
                    </div>
                    {typeof a.realizedPnl === "number" && (
                      <div className="text-[11px] text-muted-foreground">
                        Realized PnL: {formatMoney(a.realizedPnl, a.currency)}
                      </div>
                    )}
                  </div>

                  {/* Ein-/Auszahlung direkt hier zugänglich */}
                  <AccountAdjustButton
                    userId={userId}
                    accountId={a._id}
                    currency={a.currency}
                    triggerVariant="secondary"
                  />
                </div>

                {/* Basisdaten */}
                <div className="grid grid-cols-3 gap-3 text-sm w-full max-w-full min-w-0">
                  <div className="min-w-0">
                    <div className="opacity-60">Startkapital</div>
                    <div className="font-medium tabular-nums truncate">
                      {formatMoney(a.startingBalance, a.currency)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="opacity-60">Risiko/Trade</div>
                    <div className="font-medium tabular-nums">
                      {a.riskPerTrade !== undefined && a.riskPerTrade !== null
                        ? `${a.riskPerTrade}%`
                        : "—"}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="opacity-60">Währung</div>
                    <div className="font-medium truncate">{a.currency || "—"}</div>
                  </div>
                </div>

                <Separator />
                <AccountQuickStats
                  userId={userId}
                  accountId={a._id}
                  currency={a.currency}
                />
              </CardContent>

              <CardFooter className="mt-auto flex items-center justify-end gap-2 flex-wrap">
                <Button
                  variant={isActive ? "default" : "outline"}
                  onClick={() => onFilterRecap(a)}
                  aria-pressed={isActive}
                  title="Recap & Charts auf diesen Account filtern"
                  className="whitespace-nowrap"
                >
                  {isActive ? "Ausgewählt" : "In Recap filtern"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => onFilterRecap(a)}
                  title="Account-Details (später)"
                  className="whitespace-nowrap"
                >
                  Details
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
