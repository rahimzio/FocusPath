// components/trading/WeeklyTradingReflection.tsx
"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

/* ---------- Helpers ---------- */
function segmentRangeFromLabel(label: string) {
  // label: "YYYY-MM W1..W4"  → Period [start, end)
  const m = label?.match(/^(\d{4})-(\d{2})\s+W([1-4])$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mIdx = Number(m[2]); // 1..12
  const w = Number(m[3]); // 1..4

  const iso = (d: Date) => d.toISOString();
  const firstOfMonth = new Date(Date.UTC(y, mIdx - 1, 1));
  const nextMonth = new Date(Date.UTC(y, mIdx, 1));

  const segs = [
    { start: new Date(Date.UTC(y, mIdx - 1, 1)), end: new Date(Date.UTC(y, mIdx - 1, 8)) }, // [1..7]
    { start: new Date(Date.UTC(y, mIdx - 1, 8)), end: new Date(Date.UTC(y, mIdx - 1, 15)) }, // [8..14]
    { start: new Date(Date.UTC(y, mIdx - 1, 15)), end: new Date(Date.UTC(y, mIdx - 1, 22)) }, // [15..21]
    { start: new Date(Date.UTC(y, mIdx - 1, 22)), end: nextMonth }, // [22..end)
  ];

  const seg = segs[w - 1];
  if (!seg) return null;
  return { start: iso(seg.start), end: iso(seg.end) };
}

function num(n: any, d = 0) {
  return typeof n === "number" && !Number.isNaN(n) ? n : d;
}

/* ---------- Subcomponents ---------- */

function ABCWinrate({ byGame }: { byGame: any[] }) {
  const data = ["A", "B", "C"].map((g) => {
    const r = (byGame || []).find((x: any) => x?.game === g) || {};
    const winratePct = Math.round(num(r.winrate, 0) * 100);
    return {
      game: g,
      winrate: winratePct,
      trades: num(r.trades, 0),
      avgR: num(r.avgR, 0),
      expectancyR: num(r.expectancyR, 0),
      comp: Math.round(num(r.complianceAvg, 0)),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B/C-Game Winrates (Woche)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="game" />
              <YAxis unit="%" />
              <Tooltip />
              <Bar dataKey="winrate" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {data.map((d) => (
            <div key={d.game} className="rounded-md border p-2">
              <div className="font-medium">{d.game}-Game</div>
              <div>Trades: {d.trades}</div>
              <div>Winrate: {d.winrate}%</div>
              <div>ØR: {num(d.avgR, 0).toFixed(2)}</div>
              <div>Expectancy: {num(d.expectancyR, 0).toFixed(2)}R</div>
              <div>Compliance: {d.comp}%</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessKPIs({ p }: { p: any }) {
  const dist = p?.executionTimingDist || {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Process KPIs</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-3">
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Compliance (Ø)</div>
          <div className="text-2xl font-semibold">{num(p?.complianceAvg, 0)}%</div>
          <div className="text-xs">
            Process Quality Index: <b>{num(p?.pqi, 0)}</b>
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Setup-Validity</div>
          <div className="text-2xl font-semibold">
            {Math.round(num(p?.setupValidityRate, 0) * 100)}%
          </div>
          <div className="text-sm">
            Risk-Adherence: {Math.round(num(p?.riskAdherenceRate, 0) * 100)}%
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm text-muted-foreground">Execution Timing</div>
          <div className="text-sm">
            Early: {num(dist.early, 0)} · OK: {num(dist.ok, 0)} · Late: {num(dist.late, 0)}
          </div>
        </div>
        <div className="md:col-span-3 rounded-md border p-3">
          <div className="font-medium mb-2">Process vs Outcome</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="border rounded p-2 bg-green-50">
              Good Process • Good Outcome:{" "}
              <b>{num(p?.matrix?.goodProcess_goodOutcome, 0)}</b>
            </div>
            <div className="border rounded p-2 bg-yellow-50">
              Good Process • Bad Outcome: <b>{num(p?.matrix?.goodProcess_badOutcome, 0)}</b>
            </div>
            <div className="border rounded p-2 bg-orange-50">
              Bad Process • Good Outcome: <b>{num(p?.matrix?.badProcess_goodOutcome, 0)}</b>
            </div>
            <div className="border rounded p-2 bg-red-50">
              Bad Process • Bad Outcome: <b>{num(p?.matrix?.badProcess_badOutcome, 0)}</b>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Main ---------- */

export default function WeeklyTradingReflection({
  userId,
  label,
}: {
  userId: string;
  label: string;
}) {
  // ⚠️ Dein Endpoint-Name
  const { data: raw, error, isLoading } = useSWR(
    `/api/trading/weeklytrades?userId=${userId}&label=${encodeURIComponent(label)}`
  );

  // Das API kann {kpis,...} direkt ODER als {stats:{kpis,...}} liefern → normalize:
  const data = useMemo(() => {
    if (!raw) return null;
    if ("kpis" in raw || "processKPIs" in raw) return raw;
    if ("stats" in raw) return (raw as any).stats;
    return raw;
  }, [raw]);

  const kpis = useMemo(() => data?.kpis || {}, [data]);

  const handleCompute = useCallback(async () => {
    const rng = segmentRangeFromLabel(label);
    if (!rng) return alert('Ungültiges Week-Label. Erwartet z. B. "2025-09 W3".');

    try {
      const resp = await fetch(`/api/trading/weeklytrades/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, label, period: rng }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || "Compute fehlgeschlagen");
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Fehler beim Berechnen");
    } finally {
      mutate(`/api/trading/weeklytrades?userId=${userId}&label=${encodeURIComponent(label)}`);
    }
  }, [label, userId]);

  if (error) return <div>Fehler beim Laden.</div>;
  if (isLoading) return <div>Lade Weekly Summary…</div>;

  // Wenn keine Daten → Compute-CTA
  if (!data?.kpis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label} – keine Weekly-Daten gefunden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm opacity-80">
            Klicke auf „Jetzt berechnen“, um diese Woche aus deinen Trades/Daily-Reflections zu aggregieren.
          </div>
          <Button variant="outline" onClick={handleCompute}>
            Jetzt berechnen
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Trades</CardTitle>
          </CardHeader>
          <CardContent>{num(kpis.trades, 0)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Winrate</CardTitle>
          </CardHeader>
          <CardContent>{Math.round(num(kpis.winrate, 0) * 100)}%</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compliance</CardTitle>
          </CardHeader>
          <CardContent>{num(kpis.complianceAvg, 0)}%</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="process">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="process">Process</TabsTrigger>
          <TabsTrigger value="abc">A/B/C</TabsTrigger>
          <TabsTrigger value="daily">Daily Minis</TabsTrigger>
        </TabsList>

        <TabsContent value="process">
          <ProcessKPIs p={data?.processKPIs} />
        </TabsContent>

        <TabsContent value="abc">
          <ABCWinrate byGame={data?.gameStats?.byGame || []} />
        </TabsContent>

        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle>Wochentage</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-7 gap-2 text-sm">
              {(data?.miniDaily || []).map((d: any) => (
                <div key={d.date} className="border rounded p-2">
                  <div className="font-medium">
                    {d?.date ? new Date(d.date).toLocaleDateString("de-DE") : "—"}
                  </div>
                  <div>Game: {d?.abcg ?? "—"}</div>
                  <div>Discipline: {num(d?.discipline, 0)}</div>
                  {d?.tilt && <div>⚠ Tilt</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
