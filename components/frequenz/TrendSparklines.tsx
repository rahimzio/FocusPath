'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

type Point = { date: string; taskScore?: number; convTarget?: number; moodAvg?: number };

function fmtDate(d: string) {
  // "2025-08-13" -> "13.08."
  const [y, m, day] = d.split('-');
  return `${day}.${m}.`;
}
function avg(arr: number[]) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : NaN;
}
function deltaWindow(series: number[], win: number) {
  if (!series.length || series.length < win * 2) return null;
  const tail = series.slice(-win);
  const prev = series.slice(-(win * 2), -win);
  const a = avg(tail);
  const b = avg(prev);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}

export default function TrendSparklines({ userId, defaultDays = 28 }: { userId: string; defaultDays?: 7 | 14 | 28 }) {
  const [days, setDays] = React.useState<7 | 14 | 28>(defaultDays);
  const [series, setSeries] = React.useState<Point[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ userId, days: String(days) }).toString();
      const r = await fetch(`/api/frequency/series?${q}`);
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setSeries(j.series || []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, days]);

  const freqArr = series.map((p) => (typeof p.taskScore === 'number' ? p.taskScore : NaN));
  const convArr = series.map((p) => (typeof p.convTarget === 'number' ? p.convTarget : NaN));
  const moodArr = series.map((p) => (typeof p.moodAvg === 'number' ? p.moodAvg : NaN));

  const d7_freq = deltaWindow(freqArr, 7);
  const d14_freq = deltaWindow(freqArr, 14);
  const d7_conv = deltaWindow(convArr, 7);
  const d14_conv = deltaWindow(convArr, 14);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Trends (Sparklines)</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Zeitfenster</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 7 | 14 | 28)}
            className="px-2 py-1.5 border rounded text-sm"
          >
            <option value={7}>7 Tage</option>
            <option value={14}>14 Tage</option>
            <option value={28}>28 Tage</option>
          </select>
          <button
            onClick={load}
            className="px-2 py-1.5 rounded border text-sm bg-white hover:bg-gray-50"
            title="Neu laden"
          >
            Aktualisieren
          </button>
        </div>
      </div>

      {loading && <div className="mt-3 text-xs text-gray-500">Lade Daten…</div>}
      {error && <div className="mt-3 text-xs text-rose-600">{error}</div>}

      {!!series.length && (
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {/* Frequency % */}
          <SparkCard
            title="Frequency (%)"
            dataKey="taskScore"
            unit="%"
            series={series}
            yDomain={[0, 100]}
            refLines={[40, 70, 90]}
            d7={d7_freq}
            d14={d14_freq}
          />

          {/* Conviction Target (0..10) */}
          <SparkCard
            title="Conviction Target"
            dataKey="convTarget"
            unit=" / 10"
            series={series}
            yDomain={[0, 10]}
            d7={d7_conv}
            d14={d14_conv}
          />

          {/* MoodAvg (−1..+1) */}
          <SparkCard
            title="Mood Avg"
            dataKey="moodAvg"
            unit=""
            series={series}
            yDomain={[-1, 1]}
            refLines={[0]}
            formatter={(v) => (typeof v === 'number' ? v.toFixed(2) : '—')}
          />
        </div>
      )}

      <p className="mt-3 text-[11px] text-gray-600">
        Δ7/Δ14 zeigen den Unterschied zwischen dem Durchschnitt der letzten 7/14 Tage und dem Durchschnitt der 7/14 Tage
        davor. Werte stammen aus <code>frequency_daily_summary</code>.
      </p>
    </div>
  );
}

function SparkCard({
  title,
  dataKey,
  unit,
  series,
  yDomain,
  refLines = [],
  d7,
  d14,
  formatter,
}: {
  title: string;
  dataKey: keyof Point;
  unit: string;
  series: Point[];
  yDomain: [number, number];
  refLines?: number[];
  d7?: number | null;
  d14?: number | null;
  formatter?: (v: number | undefined) => string;
}) {
  const values = series.map((p) => (typeof p[dataKey] === 'number' ? (p[dataKey] as number) : NaN));
  const last = values.length ? values[values.length - 1] : NaN;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[10px] text-gray-600">
          {Number.isFinite(last) ? (formatter ? formatter(last) : `${last}${unit}`) : '—'}
        </div>
      </div>

      <div className="mt-2 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid stroke="#f3f4f6" strokeDasharray="4 4" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
            <YAxis domain={yDomain} hide />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: any) => (formatter ? formatter(v) : `${v}${unit}`)}
              labelFormatter={(l) => `Datum: ${l}`}
            />
            {refLines.map((y) => (
              <ReferenceLine key={y} y={y} stroke="#9ca3af" strokeDasharray="3 3" />
            ))}
            <Line type="monotone" dataKey={dataKey as any} dot={false} stroke="#111827" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[10px]">
        <DeltaBadge label="Δ7" value={d7} unit={unit} />
        <DeltaBadge label="Δ14" value={d14} unit={unit} />
      </div>
    </div>
  );
}

function DeltaBadge({ label, value, unit }: { label: string; value?: number | null; unit: string }) {
  if (typeof value !== 'number') return <span className="text-gray-400">{label}: —</span>;
  const s = Math.sign(value);
  const tone = s > 0 ? 'text-emerald-600' : s < 0 ? 'text-rose-600' : 'text-gray-600';
  const abs = Math.abs(value);
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      {label}: {abs.toFixed(unit === '%' ? 1 : 2)}
      {unit}
    </span>
  );
}
