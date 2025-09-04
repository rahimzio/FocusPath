"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

type MonthRow = {
  month: string; // "YYYY-MM"
  pnl: number;
  trades: number;
  winrate: number; // 0..1
  avgPnl: number;
};

type ApiResponse = {
  months: MonthRow[];
  maxDrawdown: number; // absolut
  avgRiskReward: number; // Ø RR
};

/** Robuster Fetcher:
 * - wirft auf !res.ok (SWR setzt `error`)
 * - normalisiert das Response-Shape (Fallbacks)
 */
const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await fetch(url);
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore body parse error; handled below
  }
  if (!res.ok) {
    const msg =
      (json && (json.error || json.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return {
    months: Array.isArray(json?.months) ? json.months : [],
    maxDrawdown: Number(json?.maxDrawdown ?? 0),
    avgRiskReward: Number(json?.avgRiskReward ?? 0),
  };
};

export default function MonthlyStatsOverlay({ userId }: { userId: string }) {
  // URL + Events (account-change / strategy-select) → Filter
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy] = React.useState<string | undefined>();

  React.useEffect(() => {
    const url = new URL(window.location.href);
    setAccountId(url.searchParams.get("account") || undefined);
    setStrategy(url.searchParams.get("strategy") || undefined);

    const onAccount = (e: any) =>
      setAccountId(e?.detail?.accountId || undefined);
    const onStrategy = (e: any) =>
      setStrategy(e?.detail?.name || e?.detail?.strategy || undefined);

    window.addEventListener("account-change", onAccount as EventListener);
    window.addEventListener("strategy-select", onStrategy as EventListener);
    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-select", onStrategy as EventListener);
    };
  }, []);

  // SWR-Key
  const key = React.useMemo(() => {
    if (!userId) return null;
    const params = new URLSearchParams();
    if (accountId) params.set("accountId", accountId);
    if (strategy) params.set("strategy", strategy);
    const qs = params.toString();
    return `/api/trading/monthly/${encodeURIComponent(userId)}${
      qs ? `?${qs}` : ""
    }`;
  }, [userId, accountId, strategy]);

  const { data, error, isLoading } = useSWR<ApiResponse>(key, fetcher);

  if (error)
    return (
      <div className="text-red-600">
        Fehler beim Laden der Monatsstatistik: {String(error.message || error)}
      </div>
    );
  if (!data || isLoading)
    return <div className="opacity-70">Lade Monatsstatistik…</div>;

  // defensives Auslesen
  const months: MonthRow[] = Array.isArray(data.months) ? data.months : [];
  const maxDrawdown = Number(data.maxDrawdown ?? 0);
  const avgRiskReward = Number(data.avgRiskReward ?? 0);

  // Equity aus Monats-PnL (für Linie)
  let eq = 0;
  const chart = months.map((m) => {
    eq += m.pnl ?? 0;
    return { ...m, equity: eq, label: m.month };
  });

  // kleine Hilfsformate
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const eur = (n: number) =>
    Number.isFinite(n) ? `${n.toFixed(2)}€` : "–";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Monatliche Übersicht</CardTitle>
            <CardDescription>
              Kumulierte PnL, Max Drawdown & Ø Risk/Reward nach Monaten.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Max DD: {eur(maxDrawdown)}</Badge>
            <Badge variant="secondary">Ø RR: {avgRiskReward.toFixed(2)}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hinweis bei leeren Daten */}
        {months.length === 0 && (
          <div className="opacity-70">
            Keine Daten für die aktuelle Auswahl.
          </div>
        )}

        {/* Balken: PnL pro Monat */}
        <AspectRatio ratio={16 / 9}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(val: any, name) => {
                  if (name === "pnl") return [eur(Number(val)), "PnL"];
                  if (name === "equity") return [eur(Number(val)), "Equity"];
                  if (name === "winrate") return [pct(Number(val)), "Winrate"];
                  if (name === "avgPnl") return [eur(Number(val)), "Ø PnL"];
                  return [val, name];
                }}
                labelFormatter={(l) => `Monat: ${l}`}
              />
              <Bar dataKey="pnl" name="pnl" />
            </BarChart>
          </ResponsiveContainer>
        </AspectRatio>

        {/* Linie: Equity über Monate */}
        <AspectRatio ratio={16 / 9}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(val: any, name) => {
                  if (name === "equity") return [eur(Number(val)), "Equity"];
                  return [val, name];
                }}
                labelFormatter={(l) => `Monat: ${l}`}
              />
              <Line
                type="monotone"
                dataKey="equity"
                name="equity"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </AspectRatio>

        <Separator />

        {/* Tabellenartige Kurzinfos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {months.map((m) => (
            <div
              key={m.month}
              className="rounded-md border p-3 flex items-center justify-between"
            >
              <div className="font-medium">{m.month}</div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Trades: {m.trades}</Badge>
                <Badge variant="outline">Winrate: {pct(m.winrate)}</Badge>
                <Badge>Ø PnL: {eur(m.avgPnl)}</Badge>
                <Badge variant={m.pnl >= 0 ? "secondary" : "outline"}>
                  PnL: {eur(m.pnl)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
