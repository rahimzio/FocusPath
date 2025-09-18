// components/trading/TradingHistory.tsx
"use client";

import useSWR, { mutate } from "swr";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** kleine Client-Helper, damit kein Import-Fehler im Browser entsteht */
function getMonthFourSegments(ym: string) {
  const [yStr, mStr] = ym.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const iso = (d: Date) => d.toISOString();
  const nextMonth = new Date(Date.UTC(y, m, 1));
  return [
    { label: `${ym} W1`, start: iso(new Date(Date.UTC(y, m - 1, 1))),  end: iso(new Date(Date.UTC(y, m - 1, 8))) },
    { label: `${ym} W2`, start: iso(new Date(Date.UTC(y, m - 1, 8))),  end: iso(new Date(Date.UTC(y, m - 1, 15))) },
    { label: `${ym} W3`, start: iso(new Date(Date.UTC(y, m - 1, 15))), end: iso(new Date(Date.UTC(y, m - 1, 22))) },
    { label: `${ym} W4`, start: iso(new Date(Date.UTC(y, m - 1, 22))), end: iso(nextMonth) },
  ];
}

function safeToFixed(n: any, digits = 2) {
  const val = typeof n === "number" && !Number.isNaN(n) ? n : 0;
  try { return val.toFixed(digits); } catch { return "0.00"; }
}

export default function TradingHistory({ userId }: { userId: string }) {
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const quarterIndex = Math.floor(new Date().getMonth() / 3);
  const initialQ = (["Q1", "Q2", "Q3", "Q4"] as const)[quarterIndex];
  const [q, setQ] = useState<"Q1" | "Q2" | "Q3" | "Q4">(initialQ);

  const quarter = `${year}-${q}`;

  // ✅ angepasste Endpoints
  const { data: weekly, isLoading: lw, error: ew } = useSWR(
    `/api/trading/history/weeklytrades?userId=${userId}&month=${month}`
  );
  const { data: monthly, isLoading: lm, error: em } = useSWR(
    `/api/trading/monthly?userId=${userId}&month=${month}`
  );
  const { data: quarterly, isLoading: lq, error: eq } = useSWR(
    `/api/trading/quarterly?userId=${userId}&quarter=${quarter}`
  );

  const segments = useMemo(() => getMonthFourSegments(month), [month]);

  const computeWeek = async (seg: { label: string; start: string; end: string }) => {
    try {
      // ✅ angepasster Compute-Pfad
      await fetch(`/api/trading/weeklytrades/compute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, label: seg.label, period: { start: seg.start, end: seg.end } }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      // ✅ korrektes Revalidate der neuen + abhängigen Routen
      mutate(`/api/trading/history/weeklytrades?userId=${userId}&month=${month}`);
      mutate(`/api/trading/monthly?userId=${userId}&month=${month}`);
      mutate(`/api/trading/quarterly?userId=${userId}&quarter=${quarter}`);
    }
  };

  const WeeklyGrid = () => {
    if (lw) return <div className="opacity-70">Lade Wochen…</div>;
    if (ew) return <div className="text-red-500 text-sm">Fehler beim Laden der Wochen.</div>;

    const weeks: any[] = weekly?.weeks ?? [];
    // Fallback: wenn API noch nichts zurückgibt, zeige die 4 Segmente als “missing”
    const byLabel = new Map((weeks || []).map((w) => [w?.label, w]));
    const ordered = segments.map(
      (seg) => byLabel.get(seg.label) || { label: seg.label, period: { start: seg.start, end: seg.end }, missing: true }
    );

    return (
      <div className="grid md:grid-cols-4 gap-3">
        {ordered.map((w) => {
          const k = w?.kpis || {};
          const p = w?.processKPIs || {};
          const missing = !!w?.missing || !w?.kpis;

          return (
            <Card key={w?.label} className={missing ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>{w?.label ?? "Woche"}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {missing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => computeWeek(w?.period || segments.find((s) => s.label === w?.label)!)}
                  >
                    Jetzt berechnen
                  </Button>
                ) : (
                  <>
                    <div>Trades: {k?.trades ?? 0}</div>
                    <div>Winrate: {Math.round((k?.winrate ?? 0) * 100)}%</div>
                    <div>Expectancy: {safeToFixed(k?.expectancyR, 2)}R</div>
                    <div>Compliance: {p?.complianceAvg ?? 0}%</div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const MonthCard = () => {
    if (lm) return <div className="opacity-70">Lade Monat…</div>;
    if (em) return <div className="text-red-500 text-sm">Fehler beim Laden der Monatsanalyse.</div>;
    if (!monthly) return <div>Keine Monatsdaten.</div>;

    const mk = monthly?.kpis || {};
    const mp = monthly?.processKPIs || {};

    return (
      <Card>
        <CardHeader>
          <CardTitle>{monthly?.month ?? month} – Monatsanalyse</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
          <div>Trades: {mk?.trades ?? 0}</div>
          <div>Winrate: {Math.round((mk?.winrate ?? 0) * 100)}%</div>
          <div>Expectancy: {safeToFixed(mk?.expectancyR, 2)}R</div>
          <div>Compliance: {mp?.complianceAvg ?? 0}%</div>

          <div className="md:col-span-4 mt-2">
            <div className="font-medium">Wochen:</div>
            <div className="grid md:grid-cols-4 gap-2 mt-1">
              {(monthly?.weeks || []).map((w: any) => {
                const wk = w?.kpis || {};
                const wp = w?.processKPIs || {};
                const missing = !!w?.missing || !wk?.trades;

                return (
                  <div key={w?.label} className="border rounded p-2 text-sm">
                    <div className="font-medium">{w?.label ?? "Woche"}</div>
                    {missing ? (
                      <div className="opacity-70">Keine Daten</div>
                    ) : (
                      <>
                        <div>ØR: {safeToFixed(wk?.avgR, 2)}</div>
                        <div>Compliance: {wp?.complianceAvg ?? 0}%</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const QuarterCard = () => {
    if (lq) return <div className="opacity-70">Lade Quartal…</div>;
    if (eq) return <div className="text-red-500 text-sm">Fehler beim Laden der Quartalsanalyse.</div>;
    if (!quarterly) return <div>Keine Quartalsdaten.</div>;

    const qk = quarterly?.kpis || {};
    const qp = quarterly?.processKPIs || {};

    return (
      <Card>
        <CardHeader>
          <CardTitle>{quarterly?.quarter ?? quarter} – Quartalsanalyse</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
          <div>Trades: {qk?.trades ?? 0}</div>
          <div>Winrate: {Math.round((qk?.winrate ?? 0) * 100)}%</div>
          <div>Expectancy: {safeToFixed(qk?.expectancyR, 2)}R</div>
          <div>Compliance: {qp?.complianceAvg ?? 0}%</div>

          <div className="md:col-span-4 mt-2">
            <div className="font-medium">Monate:</div>
            <div className="grid md:grid-cols-3 gap-2 mt-1">
              {(quarterly?.months || []).map((m: any) => {
                const mk = m?.kpis || {};
                const mp = m?.processKPIs || {};
                return (
                  <div key={m?.month} className="border rounded p-2 text-sm">
                    <div className="font-medium">{m?.month ?? "Monat"}</div>
                    <div>Trades: {mk?.trades ?? 0}</div>
                    <div>Winrate: {Math.round((mk?.winrate ?? 0) * 100)}%</div>
                    <div>Compliance: {mp?.complianceAvg ?? 0}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Picker */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return (
              <option key={y} value={y}>
                {y}
              </option>
            );
          })}
        </select>
        <select value={q} onChange={(e) => setQ(e.target.value as any)} className="border rounded px-2 py-1">
          {(["Q1", "Q2", "Q3", "Q4"] as const).map((opt) => (
            <option key={opt} value={opt}>
              {year} {opt}
            </option>
          ))}
        </select>
      </div>

      <Tabs defaultValue="week">
        <TabsList>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="quarter">Quarter</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          <WeeklyGrid />
        </TabsContent>

        <TabsContent value="month">
          <MonthCard />
        </TabsContent>

        <TabsContent value="quarter">
          <QuarterCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
