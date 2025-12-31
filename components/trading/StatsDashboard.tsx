"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";

type RateBlock = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  pnl?: number;
  avgR?: number;
  expectancyR?: number;
  plannedRRAvg?: number;
};

type TrendPoint = {
  date: string;
  trades: number;
  pnl: number;
  cumPnl: number;
};

type StatsResponse = {
  kpis: {
    trades: number;
    winRate: number;
    pnl: number;
    maxDD: number;
    bestPair?: { pair: string; trades: number; winRate: number };
    disciplineAvg?: number;
    strategyYesPct?: number;
    processAdherenceAvg?: number;
    plannedRRAvg?: number;
    realizedRAvg?: number;
  };
  avgTradesPer: {
    perCalendarDay: number;
    perCalendarWeek: number;
    perCalendarMonth: number;
  };
  byPair: RateBlock[];
  byStrategy: RateBlock[];
  byDow: RateBlock[];
  bySession: RateBlock[];
  byHalfHour: RateBlock[];
  trendDaily: TrendPoint[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function pct(n?: number) {
  return (Number(n || 0) * 100).toFixed(1) + "%";
}
function date10(d?: string) {
  return (d || "").slice(0, 10);
}

export default function StatsDashboard({ userId }: { userId: string }) {
  const [from, setFrom] = React.useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [to, setTo] = React.useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [includeDrafts, setIncludeDrafts] = React.useState(false);
  const [countBE, setCountBE] =
    React.useState<"neutral" | "win" | "loss">("neutral");

  const qs = new URLSearchParams({
    userId,
    from,
    to,
    includeDrafts: String(includeDrafts),
    countBE,
  }).toString();

  const { data, isLoading } = useSWR<StatsResponse>(
    `/api/trading/stats?${qs}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <div className="text-xs mb-1">Von</div>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(date10(e.target.value))}
            />
          </div>
          <div>
            <div className="text-xs mb-1">Bis</div>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(date10(e.target.value))}
            />
          </div>
          <div>
            <div className="text-xs mb-1">BE Zählweise</div>
            <Select value={countBE} onValueChange={(v: any) => setCountBE(v)}>
              <SelectTrigger>
                <SelectValue placeholder="neutral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neutral">Neutral (ausschließen)</SelectItem>
                <SelectItem value="win">Als Win zählen</SelectItem>
                <SelectItem value="loss">Als Loss zählen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDrafts}
                onChange={(e) => setIncludeDrafts(e.target.checked)}
              />
              Drafts einbeziehen
            </label>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFrom(
                  new Date(Date.now() - 30 * 86400000)
                    .toISOString()
                    .slice(0, 10)
                );
                setTo(new Date().toISOString().slice(0, 10));
                setIncludeDrafts(false);
                setCountBE("neutral");
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiCard label="Trades" value={k?.trades ?? 0} />
        <KpiCard label="Win-Rate" value={pct(k?.winRate)} />
        <KpiCard label="PnL (Summe)" value={(k?.pnl ?? 0).toFixed(2)} />
        <KpiCard label="Max Drawdown" value={(k?.maxDD ?? 0).toFixed(2)} />
        <KpiCard
          label="Ø gepl. RR"
          value={
            k?.plannedRRAvg !== undefined ? k!.plannedRRAvg!.toFixed(2) : "—"
          }
        />
        <KpiCard
          label="Ø real. R"
          value={
            k?.realizedRAvg !== undefined ? k!.realizedRAvg!.toFixed(2) : "—"
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Ø Trades/Tag"
          value={
            data ? data.avgTradesPer.perCalendarDay.toFixed(2) : "—"
          }
        />
        <KpiCard
          label="Ø Trades/Woche"
          value={
            data ? data.avgTradesPer.perCalendarWeek.toFixed(2) : "—"
          }
        />
        <KpiCard
          label="Ø Trades/Monat"
          value={
            data ? data.avgTradesPer.perCalendarMonth.toFixed(2) : "—"
          }
        />
      </div>

      {k?.bestPair ? (
        <Card>
          <CardHeader>
            <CardTitle>Bestes Paar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Badge>{k.bestPair.pair}</Badge>
            <div className="text-sm text-muted-foreground">
              {k.bestPair.trades} Trades · Win-Rate {pct(k.bestPair.winRate)}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Nach Paar (Win-Rate & Trades)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data?.byPair ?? []).slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(val: any, name: string) =>
                  name === "Win-Rate" ? pct(val) : val
                }
              />
              {/* 🔵 Trades = blau, 🟢 Winrate = grün */}
              <Bar
                yAxisId="left"
                dataKey="trades"
                name="Trades"
                fill="#3b82f6" // blue-500
              />
              <Bar
                yAxisId="right"
                dataKey="winRate"
                name="Win-Rate"
                fill="#22c55e" // green-500
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nach Strategie (Win-Rate & Trades)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(data?.byStrategy ?? []).slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(val: any, name: string) =>
                  name === "Win-Rate" ? pct(val) : val
                }
              />
              {/* hier leicht andere Töne, damit man Charts unterscheiden kann */}
              <Bar
                yAxisId="left"
                dataKey="trades"
                name="Trades"
                fill="#6366f1" // indigo-500
              />
              <Bar
                yAxisId="right"
                dataKey="winRate"
                name="Win-Rate"
                fill="#10b981" // emerald-500
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nach Uhrzeit (30-Min-Slots)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.byHalfHour ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip />
              {/* lila Balken für Zeitverteilung */}
              <Bar
                dataKey="trades"
                name="Trades"
                fill="#a855f7" // purple-500
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            Basis: <code>startTime</code> (Fallback <code>entryTime</code>) in
            30-Minuten-Böcken, lokal nicht umgerechnet (UTC-Interpretation der
            gespeicherten Strings).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Täglicher Verlauf (PnL & kumuliert)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.trendDaily ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {/* 🔴 Tages-PnL rot, 🟢 kumuliert grün */}
              <Line
                type="monotone"
                dataKey="pnl"
                name="PnL"
                stroke="#ef4444" // red-500
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="cumPnl"
                name="Kumuliert"
                stroke="#22c55e" // green-500
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}
