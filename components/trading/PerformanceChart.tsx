"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Brush,
} from "recharts";

type Props = { userId: string };

type StatsResponse = {
  count: number;
  winrate: number;   // 0..1
  avgPnl: number;
  avgRating: number;
  history: { day: string; count: number; pnl: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmtDate(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}.${m}.`;
}
const toNumber = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x) : 0);

export default function PerformanceChart({ userId }: Props) {
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy] = React.useState<string | undefined>();

  // NEU: Zeitraum/Metrik
  const [range, setRange] = React.useState<"week" | "month" | "all">("month");
  const [metric, setMetric] = React.useState<"pnl" | "count">("pnl");
  const [cumulative, setCumulative] = React.useState<boolean>(true);

  // URL & Events lesen
  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setAccountId(url.searchParams.get("account") || undefined);
      setStrategy(url.searchParams.get("strategy") || undefined);
      const r = url.searchParams.get("range");
      if (r === "week" || r === "month" || r === "all") setRange(r);
    } catch {}
    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    const onStrategy = (e: any) => setStrategy(e?.detail?.name || undefined);
    window.addEventListener("account-change", onAccount as EventListener);
    window.addEventListener("strategy-select", onStrategy as EventListener);
    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-select", onStrategy as EventListener);
    };
  }, []);

  // SWR-Key → /api/trading/getStats
  const key = React.useMemo(() => {
    if (!userId) return null;
    const qs = [
      `userId=${encodeURIComponent(userId)}`,
      `range=${range}`,
      accountId ? `accountId=${encodeURIComponent(accountId)}` : null,
      strategy ? `strategy=${encodeURIComponent(strategy)}` : null,
      (() => {
        try {
          const u = new URL(window.location.href);
          const from = u.searchParams.get("from");
          const to = u.searchParams.get("to");
          return [from ? `from=${encodeURIComponent(from)}` : null, to ? `to=${encodeURIComponent(to)}` : null]
            .filter(Boolean)
            .join("&");
        } catch {
          return null;
        }
      })(),
    ]
      .filter(Boolean)
      .join("&");
    return `/api/trading/getStats?${qs}`;
  }, [userId, accountId, strategy, range]);

  const { data, error } = useSWR<StatsResponse>(key, fetcher);

  const count = toNumber(data?.count);
  const winrate = toNumber(data?.winrate); // 0..1
  const avgPnl = toNumber(data?.avgPnl);
  const avgRating = toNumber(data?.avgRating);

  // Verlauf + kumuliert
  const base = React.useMemo(() => {
    const rows = Array.isArray(data?.history) ? data!.history : [];
    let run = 0;
    return rows.map((r) => {
      const pnl = toNumber(r.pnl);
      run += pnl;
      return {
        day: String(r.day).slice(0, 10),
        pnl,
        cumPnl: run,
        count: toNumber(r.count),
      };
    });
  }, [data]);

  // Datensatz je nach Metrik
  const chartData = React.useMemo(() => {
    if (metric === "count") return base.map((d) => ({ day: d.day, value: d.count }));
    return base.map((d) => ({ day: d.day, value: cumulative ? d.cumPnl : d.pnl }));
  }, [base, metric, cumulative]);

  const isPnl = metric === "pnl";
  const yTick = (v: number) => (isPnl ? v.toLocaleString() : String(Math.round(v)));

  if (error) return <div className="text-red-600">Fehler beim Laden.</div>;
  if (!data) return <div className="opacity-70">Lade…</div>;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-3 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          Performance
          <Badge variant="secondary">{count} Trades</Badge>
          <Badge variant="secondary">{Math.round(winrate * 100)}% Winrate</Badge>
          <Badge variant="secondary">ØPnL {Number.isFinite(avgPnl) ? avgPnl.toFixed(2) : "—"}</Badge>
          <Badge variant="secondary">ØRating {Number.isFinite(avgRating) ? avgRating.toFixed(2) : "—"}</Badge>
        </CardTitle>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Range */}
          <div className="flex items-center gap-2">
            <Label htmlFor="perf-range" className="text-sm">Zeitraum</Label>
            <Select value={range} onValueChange={(v: "week" | "month" | "all") => setRange(v)}>
              <SelectTrigger id="perf-range" className="w-[120px]">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 Tage</SelectItem>
                <SelectItem value="month">30 Tage</SelectItem>
                <SelectItem value="all">Gesamt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Metrik */}
          <div className="flex items-center gap-2">
            <Label htmlFor="perf-metric" className="text-sm">Metrik</Label>
            <Select value={metric} onValueChange={(v: "pnl" | "count") => setMetric(v)}>
              <SelectTrigger id="perf-metric" className="w-[140px]">
                <SelectValue placeholder="Metrik" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pnl">PnL</SelectItem>
                <SelectItem value="count">Trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kumuliert (nur bei PnL sinnvoll) */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="perf-cum"
              checked={cumulative}
              onCheckedChange={(v) => setCumulative(v === true)}
              disabled={!isPnl}
            />
            <Label htmlFor="perf-cum" className={`text-sm ${isPnl ? "" : "opacity-50"}`}>
              kumuliert
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {chartData.length === 0 ? (
          <div className="opacity-70">Keine Daten im gewählten Zeitraum.</div>
        ) : (
          <AspectRatio ratio={16 / 9}>
            <ResponsiveContainer width="100%" height="100%">
              {isPnl ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="pcGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="day" tickFormatter={fmtDate} minTickGap={24} />
                  <YAxis tickFormatter={yTick} width={70} />
                  <Tooltip
                    formatter={(value: any) => {
                      const n = toNumber(value);
                      return [n.toLocaleString(), cumulative ? "Cum PnL" : "PnL"];
                    }}
                    labelFormatter={(label) => `Tag: ${label}`}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="url(#pcGradient)"
                    strokeWidth={2}
                    isAnimationActive
                  />
                  <Brush dataKey="day" height={24} travellerWidth={8} />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="day" tickFormatter={fmtDate} minTickGap={24} />
                  <YAxis tickFormatter={yTick} allowDecimals={false} width={50} />
                  <Tooltip
                    formatter={(value: any) => [String(value), "Trades"]}
                    labelFormatter={(label) => `Tag: ${label}`}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Bar dataKey="value" stroke="#10b981" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Brush dataKey="day" height={24} travellerWidth={8} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </AspectRatio>
        )}
      </CardContent>
    </Card>
  );
}
