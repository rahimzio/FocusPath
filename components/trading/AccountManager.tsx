"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Props = { userId: string };

type Account = {
  _id: string;
  name?: string;
  broker?: string;
  currency?: string;
  startingBalance?: number;
  riskPerTrade?: number;
  createdAt?: string;
};

type StatsData = {
  count: number;
  winrate: number; // 0..1
  avgPnl: number;
  avgRating?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const range = useUrlRange(); // Zeitraum mit Dashboard synchron halten
  const qs = `range=${range}&userId=${encodeURIComponent(userId)}&accountId=${encodeURIComponent(
    accountId
  )}`;
  const { data, error } = useSWR<StatsData>(`/api/trading/getStats?${qs}`, fetcher);

  if (error) return null;
  if (!data) return <div className="text-xs opacity-60">Lade {range === "week" ? "7-Tage" : range === "all" ? "Gesamt" : "Monats"}-Stats…</div>;

  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div>
        <div className="opacity-60">Trades</div>
        <div className="font-medium">{data.count}</div>
      </div>
      <div>
        <div className="opacity-60">Winrate</div>
        <div className="font-medium">{Math.round((data.winrate ?? 0) * 100)}%</div>
      </div>
      <div>
        <div className="opacity-60">Ø PnL</div>
        <div className="font-medium">{formatMoney(data.avgPnl, currency)}</div>
      </div>
    </div>
  );
}

export default function AccountManager({ userId }: Props) {
  const { data, error, isLoading } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = data?.accounts ?? [];

  // Aktive Auswahl über URL syncen
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const acc = url.searchParams.get("account");
      setSelectedId(acc);
      // Initiales Broadcast, damit Charts/Liste direkt sync sind
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <div className="flex gap-2">
          <Button
            variant={selectedId ? "outline" : "default"}
            onClick={() => onFilterRecap(null)}
            aria-pressed={!selectedId}
            title="Recap & Charts: alle Accounts"
          >
            Alle Accounts
          </Button>
          {/* Platz für AddAccountModal o.ä. */}
        </div>
      </div>

      {isLoading && <div className="opacity-60">Lade Konten…</div>}

      {!isLoading && accounts.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kein Account vorhanden</CardTitle>
          </CardHeader>
          <CardContent className="text-sm opacity-70">
            Lege einen Account an, inkl. Währung & Startkapital.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map((a) => {
          const isActive = selectedId === a._id;
          const title = a.name || a._id;
          return (
            <Card
              key={a._id}
              className={cn(
                "flex flex-col transition-colors",
                isActive ? "border-primary ring-1 ring-primary/40" : ""
              )}
              data-selected={isActive ? "true" : "false"}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <div className="text-xs opacity-60">
                    {a.broker ? `Broker: ${a.broker}` : "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{a.currency || "—"}</Badge>
                    {isActive && <Badge className="bg-primary text-white">Aktiv</Badge>}
                  </div>
                  {a.createdAt ? (
                    <div className="text-[10px] opacity-60">
                      seit {new Date(a.createdAt).toLocaleDateString()}
                    </div>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="opacity-60">Startkapital</div>
                    <div className="font-medium">
                      {formatMoney(a.startingBalance, a.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-60">Risiko/Trade</div>
                    <div className="font-medium">
                      {a.riskPerTrade !== undefined && a.riskPerTrade !== null
                        ? `${a.riskPerTrade}%`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="opacity-60">Währung</div>
                    <div className="font-medium">{a.currency || "—"}</div>
                  </div>
                </div>

                <Separator />
                <AccountQuickStats userId={userId} accountId={a._id} currency={a.currency} />
              </CardContent>

              <CardFooter className="mt-auto flex items-center justify-end gap-2">
                <Button
                  variant={isActive ? "default" : "outline"}
                  onClick={() => onFilterRecap(a)}
                  aria-pressed={isActive}
                  title="Recap & Charts auf diesen Account filtern"
                >
                  {isActive ? "Ausgewählt" : "In Recap filtern"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onFilterRecap(a)}
                  title="Account-Details (später)"
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
