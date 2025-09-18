"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = { userId: string };
type Row = { name: string; count: number; pct?: number };
type BreakdownKey = "mistakes" | "emotions" | "biasExecution" | "sessions";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function normalize(rowsLike: any): Row[] {
  if (!rowsLike) return [];
  const rows: Row[] = [];
  const src = rowsLike;
  if (Array.isArray(src)) {
    for (const it of src) {
      const name = String(it?.name ?? it?.label ?? it?.mistake ?? "").trim();
      const count = Number(it?.count ?? it?.value ?? it?.total ?? 0);
      if (name) rows.push({ name, count: Number.isFinite(count) ? count : 0 });
    }
  } else if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src)) rows.push({ name: String(k), count: Number(v) || 0 });
  }
  return rows.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
}

export default function MistakePatternChart({ userId }: Props) {
  const [accountId, setAccountId] = React.useState<string | undefined>();
  const [strategy, setStrategy] = React.useState<string | undefined>();

  const [topN, setTopN] = React.useState<number>(8);
  const [showPct, setShowPct] = React.useState<boolean>(true);
  const [groupOthers, setGroupOthers] = React.useState<boolean>(true);
  const [range, setRange] = React.useState<"week" | "month" | "all">("month");
  const [onlyFinal, setOnlyFinal] = React.useState<boolean>(false);
  const [breakdown, setBreakdown] = React.useState<BreakdownKey>("mistakes");

  React.useEffect(() => {
    try {
      const url = new URL(window.location.href);
      setAccountId(url.searchParams.get("account") || undefined);
      setStrategy(url.searchParams.get("strategy") || undefined);
      const r = url.searchParams.get("range");
      if (r === "week" || r === "month" || r === "all") setRange(r);
      const of = url.searchParams.get("onlyFinal");
      if (of === "true") setOnlyFinal(true);
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

  const key = React.useMemo(() => {
    if (!userId) return null;
    const parts = [`userId=${encodeURIComponent(userId)}`, `range=${range}`, `onlyFinal=${onlyFinal ? "true" : "false"}`];
    if (accountId) parts.push(`accountId=${encodeURIComponent(accountId)}`);
    if (strategy) parts.push(`strategy=${encodeURIComponent(strategy)}`);
    try {
      const u = new URL(window.location.href);
      const from = u.searchParams.get("from");
      const to = u.searchParams.get("to");
      if (from) parts.push(`from=${encodeURIComponent(from)}`);
      if (to) parts.push(`to=${encodeURIComponent(to)}`);
    } catch {}
    parts.push("minCount=1", "limit=200");
    return `/api/trading/mentalStats?${parts.join("&")}`;
  }, [userId, accountId, strategy, range, onlyFinal]);

  const { data, error } = useSWR<any>(key, fetcher);

  const kpis = {
    trades: Number(data?.totals?.trades ?? 0),
    withMistakes: Number(data?.totals?.withMistakes ?? 0),
    mistakesTotal: Number(data?.totals?.mistakesTotal ?? data?.total ?? 0),
    be: Number(data?.totals?.beCount ?? 0),
    stop: Number(data?.totals?.stopHitCount ?? 0),
  };

  const source = React.useMemo(() => {
    const counts = data?.counts;
    if (!counts) return undefined;
    switch (breakdown) {
      case "mistakes": return counts.mistakes;
      case "emotions": return counts.emotions;
      case "biasExecution": return counts.biasExecution;
      case "sessions": return counts.sessions;
    }
  }, [data, breakdown]);

  const baseRows = React.useMemo(
    () => normalize(source ?? data?.mistakes ?? data?.topMistakes ?? data?.data ?? []),
    [source, data]
  );

  const grandTotal = React.useMemo(() => baseRows.reduce((s, r) => s + r.count, 0), [baseRows]);

  const displayRows = React.useMemo(() => {
    if (baseRows.length === 0) return [];
    const withPct = baseRows.map((r) => ({ ...r, pct: grandTotal > 0 ? (r.count / grandTotal) * 100 : 0 }));
    const top = withPct.slice(0, Math.max(1, topN));
    if (!groupOthers || withPct.length <= top.length) return top;
    const others = withPct.slice(top.length);
    const othersCount = others.reduce((s, r) => s + r.count, 0);
    const othersPct = grandTotal > 0 ? (othersCount / grandTotal) * 100 : 0;
    return [...top, { name: "Andere", count: othersCount, pct: othersPct }];
  }, [baseRows, grandTotal, topN, groupOthers]);

  // Dynamische Y-Achsenbreite (verhindert Overflow bei langen Labels)
  const yAxisWidth = React.useMemo(() => {
    const longest = displayRows.reduce((m, r) => Math.max(m, r.name.length), 0);
    // grobe Schätzung: ~7px pro Zeichen + Padding
    const est = longest * 7 + 24;
    return Math.max(80, Math.min(160, est));
  }, [displayRows]);

  if (error) return <div className="text-red-600">Fehler beim Laden.</div>;
  if (!data) return <div className="opacity-70">Lade…</div>;

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <CardTitle className="flex items-center gap-2 flex-wrap min-w-0 truncate">
          <span className="truncate">Fehlermuster</span>
          <Badge variant="secondary" className="text-xs px-2 py-0.5"> {kpis.trades} Trades</Badge>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">{kpis.withMistakes} mit Fehlern</Badge>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">{kpis.mistakesTotal} Fehler</Badge>
          <Badge variant="outline" className="text-xs px-2 py-0.5">BE: {kpis.be}</Badge>
          <Badge variant="outline" className="text-xs px-2 py-0.5">SL: {kpis.stop}</Badge>
        </CardTitle>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Range */}
          <div className="flex items-center gap-2">
            <Label htmlFor="mistake-range" className="text-sm">Zeitraum</Label>
            <Select value={range} onValueChange={(v: any) => setRange(v)}>
              <SelectTrigger id="mistake-range" className="w-[110px] h-8 px-2">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">7 Tage</SelectItem>
                <SelectItem value="month">30 Tage</SelectItem>
                <SelectItem value="all">Gesamt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dimension */}
          <div className="flex items-center gap-2">
            <Label htmlFor="mistake-dim" className="text-sm">Dimension</Label>
            <Select value={breakdown} onValueChange={(v: BreakdownKey) => setBreakdown(v)}>
              <SelectTrigger id="mistake-dim" className="w-[150px] h-8 px-2">
                <SelectValue placeholder="Dimension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mistakes">Fehler</SelectItem>
                <SelectItem value="emotions">Emotionen</SelectItem>
                <SelectItem value="biasExecution">Bias/Execution</SelectItem>
                <SelectItem value="sessions">Sessions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Top-N */}
          <div className="flex items-center gap-2">
            <Label htmlFor="mistake-topn" className="text-sm">Top</Label>
            <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
              <SelectTrigger id="mistake-topn" className="w-[84px] h-8 px-2">
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                {[5, 8, 10, 15].map((n) => (
                  <SelectItem value={String(n)} key={n}>Top {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-2">
            <Checkbox id="mistake-pct" checked={showPct} onCheckedChange={(v) => setShowPct(v === true)} />
            <Label htmlFor="mistake-pct" className="text-sm">in % anzeigen</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="mistake-others" checked={groupOthers} onCheckedChange={(v) => setGroupOthers(v === true)} />
            <Label htmlFor="mistake-others" className="text-sm">„Andere“ gruppieren</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="mistake-final" checked={onlyFinal} onCheckedChange={(v) => setOnlyFinal(v === true)} />
            <Label htmlFor="mistake-final" className="text-sm">nur finale Trades</Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="w-full max-w-full min-w-0 overflow-x-hidden">
        {displayRows.length === 0 ? (
          <div className="opacity-70">Keine Daten für diese Auswahl.</div>
        ) : (
          <div className="w-full h-[280px] sm:h-[320px] md:h-[360px] min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayRows}
                layout="vertical"
                margin={{ top: 8, right: 12, bottom: 8, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => (showPct ? `${Math.round(v as number)}%` : String(v))}
                  domain={[0, (dataMax: number) => Math.ceil(dataMax)]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={yAxisWidth}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: any, _name, payload: any) => {
                    const r = payload?.payload as Row | undefined;
                    if (!r) return [value, "Count"];
                    if (showPct) return [`${(r.pct ?? 0).toFixed(1)}%`, r.name];
                    return [String(r.count), r.name];
                  }}
                  labelFormatter={() => ""}
                  wrapperStyle={{ outline: "none" }}
                />
                <Bar
                  dataKey={showPct ? "pct" : "count"}
                  stroke="#ef4444"
                  fill="#ef4444"
                  radius={[4, 4, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground">
          Gesamt in dieser Ansicht: {breakdown === "mistakes" ? kpis.mistakesTotal : grandTotal} Einträge
          {strategy ? ` • Strategie: ${strategy}` : ""}{accountId ? ` • Account: ${accountId}` : ""} • Zeitraum: {range}
          {onlyFinal ? " • nur final" : ""}
        </div>
      </CardContent>
    </Card>
  );
}
