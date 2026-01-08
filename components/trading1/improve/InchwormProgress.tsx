"use client";

import * as React from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text().catch(() => "Fetch failed"));
    return r.json();
  });

function formatPeriodLabel(data: any): string {
  // preferred: range {from,to}
  const from = data?.range?.from;
  const to = data?.range?.to;
  if (typeof from === "string" && typeof to === "string") return `${from} → ${to}`;

  // legacy: period string or object {start,end}
  const period = data?.period;
  if (!period) return "—";
  if (typeof period === "string") return period;

  if (typeof period === "object") {
    const start = typeof period.start === "string" ? period.start : "";
    const end = typeof period.end === "string" ? period.end : "";
    if (start && end) return `${start} → ${end}`;
    if (start) return start;
    if (end) return end;
  }

  return "—";
}

const n = (x: any) => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

const pct = (x: any) => {
  // supports 0..1 or 0..100
  const v = n(x);
  const p = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, Math.round(p)));
};

type Point = { x: number; y: number };

function buildLine(points: number[], w: number, h: number): string {
  if (!points.length) return "";
  const maxV = Math.max(...points, 1);
  const minV = Math.min(...points, 0);
  const span = Math.max(1, maxV - minV);

  const pts: Point[] = points.map((v, i) => {
    const x = (i / Math.max(1, points.length - 1)) * w;
    const y = h - ((v - minV) / span) * h;
    return { x, y };
  });

  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

function safeArray(input: any): number[] {
  if (!Array.isArray(input)) return [];
  return input.map((v) => n(v)).filter((v) => Number.isFinite(v));
}

/**
 * Tries to extract a timeline in one of these shapes:
 * - data.timeline: [{date, A,B,C}] or [{date, a,b,c}]
 * - data.history: same
 * - data.series: {A:[...], B:[...], C:[...]} or {a:[...],...}
 * If none found -> returns empty arrays.
 */
function extractSeries(data: any): { A: number[]; B: number[]; C: number[] } {
  // series object
  const s = data?.series ?? data?.timeSeries ?? data?.chart;
  if (s && typeof s === "object" && !Array.isArray(s)) {
    const A = safeArray(s.A ?? s.a);
    const B = safeArray(s.B ?? s.b);
    const C = safeArray(s.C ?? s.c);
    if (A.length || B.length || C.length) return { A, B, C };
  }

  // timeline arrays
  const arr = data?.timeline ?? data?.history ?? data?.items ?? data?.days;
  if (Array.isArray(arr) && arr.length) {
    const A: number[] = [];
    const B: number[] = [];
    const C: number[] = [];
    for (const row of arr) {
      A.push(n(row?.A ?? row?.a ?? row?.hitA ?? row?.rateA ?? 0));
      B.push(n(row?.B ?? row?.b ?? row?.hitB ?? row?.rateB ?? 0));
      C.push(n(row?.C ?? row?.c ?? row?.hitC ?? row?.rateC ?? 0));
    }
    // normalize 0..1 -> 0..100 if needed (only if looks like rates)
    const looksRate = (xs: number[]) => xs.length && Math.max(...xs) <= 1.2;
    const norm = (xs: number[]) => (looksRate(xs) ? xs.map((v) => v * 100) : xs);
    return { A: norm(A), B: norm(B), C: norm(C) };
  }

  return { A: [], B: [], C: [] };
}

function MiniLines({
  series,
  height = 64,
}: {
  series: { A: number[]; B: number[]; C: number[] };
  height?: number;
}) {
  const w = 260;
  const h = height;

  const a = series.A;
  const b = series.B;
  const c = series.C;

  const hasAny = a.length || b.length || c.length;

  if (!hasAny) return null;

  // NOTE: we intentionally don't set colors explicitly per your rules
  // so we use currentColor variants via opacity and strokeWidth
  const pathA = buildLine(a, w, h);
  const pathB = buildLine(b, w, h);
  const pathC = buildLine(c, w, h);

  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium mb-2">Trend (Zeitreihe)</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[72px]">
        {/* baseline grid */}
        <path d={`M 0 ${h} L ${w} ${h}`} stroke="currentColor" strokeOpacity="0.12" />
        <path d={`M 0 ${h * 0.5} L ${w} ${h * 0.5}`} stroke="currentColor" strokeOpacity="0.08" />
        <path d={`M 0 ${h * 0.25} L ${w} ${h * 0.25}`} stroke="currentColor" strokeOpacity="0.06" />

        {pathA ? <path d={pathA} fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" /> : null}
        {pathB ? <path d={pathB} fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" /> : null}
        {pathC ? <path d={pathC} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" /> : null}
      </svg>

      <div className="mt-2 flex gap-2 flex-wrap text-xs text-muted-foreground">
        <span>
          A: <b>{a.length ? pct(a[a.length - 1]) : 0}%</b>
        </span>
        <span>
          B: <b>{b.length ? pct(b[b.length - 1]) : 0}%</b>
        </span>
        <span>
          C: <b>{c.length ? pct(c[c.length - 1]) : 0}%</b>
        </span>
      </div>

      <div className="text-[11px] text-muted-foreground mt-1">
        Wenn dein Backend später echte Tageswerte liefert (timeline/series), wird das hier automatisch präziser.
      </div>
    </div>
  );
}

function Bars({
  current,
  targets,
}: {
  current: { A: number; B: number; C: number };
  targets: { A?: number; B?: number; C?: number };
}) {
  const rows: Array<{ k: "A" | "B" | "C"; cur: number; tar?: number }> = [
    { k: "A", cur: current.A, tar: targets.A },
    { k: "B", cur: current.B, tar: targets.B },
    { k: "C", cur: current.C, tar: targets.C },
  ];

  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium mb-2">Current vs Target</div>

      <div className="space-y-3">
        {rows.map((r) => {
          const cur = Math.max(0, Math.min(100, pct(r.cur)));
          const tar = r.tar == null ? undefined : Math.max(0, Math.min(100, pct(r.tar)));
          return (
            <div key={r.k} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{r.k}</span>
                <span className="text-muted-foreground">
                  Current <b>{cur}%</b>
                  {tar != null ? (
                    <>
                      {" "}
                      · Target <b>{tar}%</b>
                    </>
                  ) : null}
                </span>
              </div>

              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-2 rounded-full bg-foreground"
                  style={{ width: `${cur}%`, opacity: 0.45 }}
                />
                {tar != null ? (
                  <div
                    className="absolute top-0 h-2 w-[2px] bg-foreground"
                    style={{ left: `${tar}%`, opacity: 0.9 }}
                    title={`Target ${tar}%`}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-muted-foreground mt-2">
        Wenn du im Backend später eine Zeitreihe lieferst, wechselt die UI automatisch auf Trend-Lines.
      </div>
    </div>
  );
}

export default function InchwormProgress({ userId }: { userId: string }) {
  const key = React.useMemo(() => {
    if (!userId) return null;
    // keep compatible with your backend – you can add params later
    return `/api/trading/improve/progress?userId=${encodeURIComponent(userId)}`;
  }, [userId]);

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
  });

  // ✅ auto-refresh when plan/drill changes elsewhere
  React.useEffect(() => {
    const onAny = () => mutate();
    window.addEventListener("inchworm-plan-updated", onAny as any);
    window.addEventListener("improve-drill-done-updated", onAny as any);
    window.addEventListener("improve-todaydrill-updated", onAny as any);
    window.addEventListener("improve-drills-updated", onAny as any);
    return () => {
      window.removeEventListener("inchworm-plan-updated", onAny as any);
      window.removeEventListener("improve-drill-done-updated", onAny as any);
      window.removeEventListener("improve-todaydrill-updated", onAny as any);
      window.removeEventListener("improve-drills-updated", onAny as any);
    };
  }, [mutate]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-red-600">Fehler beim Laden.</div>;

  const periodLabel = formatPeriodLabel(data);

  // Support multiple shapes:
  // - old: current/baseline/targets in %
  // - new: hitRate {A,B,C} in 0..1
  const current = {
    A: data?.current?.A ?? data?.hitRate?.A ?? 0,
    B: data?.current?.B ?? data?.hitRate?.B ?? 0,
    C: data?.current?.C ?? data?.hitRate?.C ?? 0,
  };

  const baseline = {
    A: data?.baseline?.A ?? 0,
    B: data?.baseline?.B ?? 0,
    C: data?.baseline?.C ?? 0,
  };

  const targets = {
    A: data?.targets?.A,
    B: data?.targets?.B,
    C: data?.targets?.C,
  };

  const series = extractSeries(data);
  const hasSeries = series.A.length || series.B.length || series.C.length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Inchworm Progress</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">Zeitraum: {periodLabel}</div>

        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">A: {pct(current.A)}%</Badge>
          <Badge variant="outline">B: {pct(current.B)}%</Badge>
          <Badge variant="outline">C: {pct(current.C)}%</Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Baseline A/B/C: {pct(baseline.A)}% / {pct(baseline.B)}% / {pct(baseline.C)}% · Targets A/B/C:{" "}
          {targets.A != null ? pct(targets.A) : "—"}% / {targets.B != null ? pct(targets.B) : "—"}% /{" "}
          {targets.C != null ? pct(targets.C) : "—"}%
        </div>

        {/* ✅ Chart: auto selects Trend if series exists, else Bars */}
        {hasSeries ? (
          <MiniLines series={series} />
        ) : (
          <Bars current={{ A: current.A, B: current.B, C: current.C }} targets={targets} />
        )}

        {data?.meta?.durationMs != null ? (
          <div className="text-[10px] text-muted-foreground">loaded in {String(data.meta.durationMs)}ms</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
