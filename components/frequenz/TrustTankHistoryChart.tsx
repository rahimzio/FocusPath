'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';

type LegacyHistoryPoint = { date: string; delta: number };

type SeriesPoint = {
  date: string;
  taskScore?: number;   // 0..100
};

type Props = {
  history?: LegacyHistoryPoint[]; // Legacy bleibt funktional
  userId?: string;                // Auto-Fetch, wenn gesetzt & keine history
  days?: 7 | 14 | 28;
  end?: string;
  title?: string;
  onRunRollup?: () => void;       // optional: Button im Empty-State
};

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.`;
}

function movingAvg(arr: number[], window: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = Number.isFinite(arr[i]) ? arr[i] : NaN;
    sum += v;
    if (i >= window) {
      const prev = Number.isFinite(arr[i - window]) ? arr[i - window] : NaN;
      sum -= prev;
    }
    if (i >= window - 1) {
      const avg = sum / window;
      out.push(Number.isFinite(avg) ? avg : null);
    } else {
      out.push(null);
    }
  }
  return out;
}

export function TrustTankHistoryChart({
  history,
  userId,
  days = 28,
  end,
  title = 'Trust-Historie',
  onRunRollup,
}: Props) {
  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const autoMode = !history && !!userId;

  React.useEffect(() => {
    if (!autoMode) return;
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const q = new URLSearchParams({
          userId: String(userId),
          days: String(days),
          ...(end ? { end: String(end) } : {}),
        }).toString();
        const r = await fetch(`/api/frequency/series?${q}`);
        const j = await r.json();
        if (abort) return;
        if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        setSeries(Array.isArray(j.series) ? j.series : []);
      } catch (e: any) {
        if (!abort) setError(e?.message || 'Fehler beim Laden');
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [autoMode, userId, days, end]);

  // Datenaufbereitung
  let data: Array<{ date: string; bar: number; ma7: number | null; raw?: number }> = [];

  if (autoMode) {
    const arr = series.map((p) => (typeof p.taskScore === 'number' ? Number(p.taskScore) : NaN));
    const ma7 = movingAvg(arr, 7);
    data = series.map((p, i) => {
      const raw = typeof p.taskScore === 'number' ? p.taskScore : NaN;
      const bar = Number.isFinite(raw) ? raw - 50 : 0;
      return {
        date: p.date,
        bar,
        ma7: Number.isFinite(ma7[i]!) ? (ma7[i] as number) : null,
        raw: Number.isFinite(raw) ? raw : undefined,
      };
    });
  } else {
    const arr = (history || []).map((h) => (typeof h.delta === 'number' ? h.delta : NaN));
    const ma7 = movingAvg(arr, 7);
    data = (history || []).map((h, i) => ({
      date: h.date,
      bar: typeof h.delta === 'number' ? h.delta : 0,
      ma7: Number.isFinite(ma7[i]!) ? (ma7[i] as number) : null,
    }));
  }

  const isEmpty = autoMode && !loading && !error && series.length === 0;

  const headerRight = autoMode
    ? loading
      ? <span className="text-[10px] text-gray-500">Lade…</span>
      : error
      ? <span className="text-[10px] text-rose-600">{error}</span>
      : <span className="text-[10px] text-gray-500">Letzte {days} Tage</span>
    : <span className="text-[10px] text-gray-500">(statisch)</span>;

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {headerRight}
      </div>

      {/* EMPTY-STATE */}
      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-gray-800 mb-1">Noch keine Historie vorhanden.</div>
            <div>
              Sobald Tageszusammenfassungen existieren, siehst du hier Balken (Score−50) und den 7-Tage-Ø
              als Linie.
            </div>
          </div>
          {typeof onRunRollup === 'function' && (
            <button
              onClick={onRunRollup}
              className="px-3 py-2 rounded border bg-white hover:bg-gray-50 text-sm"
              title="Tägliches Rollup jetzt berechnen"
            >
              Rollup ausführen
            </button>
          )}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="date" tickFormatter={fmtDate} />
            <YAxis />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: any, key: any) => {
                if (key === 'bar') {
                  if (autoMode) {
                    const bar = Number(v);
                    const pct = Math.round((bar + 50) * 10) / 10;
                    return [`${bar >= 0 ? '+' : ''}${bar.toFixed(1)} (raw ${pct}%)`, 'Abweichung'];
                  }
                  return [`${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}`, 'Δ'];
                }
                if (key === 'ma7') {
                  return [Number(v).toFixed(1), autoMode ? '7T Ø (Score %)' : '7T Ø (Δ)'];
                }
                return [String(v), key];
              }}
              labelFormatter={(l) => `Datum: ${l}`}
            />
            <ReferenceLine y={0} stroke="#9ca3af" />

            <Bar dataKey="bar" name={autoMode ? 'Abweichung (Score−50)' : 'Δ'}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.bar >= 0 ? '#34d399' : '#f87171'} />
              ))}
            </Bar>

            <Line
              type="monotone"
              dataKey="ma7"
              name={autoMode ? '7T Ø (Score %)' : '7T Ø (Δ)'}
              stroke="#111827"
              dot={false}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 text-xs text-gray-600">
        {autoMode ? (
          <>
            Balken zeigen die tägliche Abweichung vom neutralen Punkt <b>50%</b> (positiv = grün, negativ = rot).
            Die Linie ist der <b>rollierende 7-Tage-Durchschnitt</b> des Scores.
          </>
        ) : (
          <>
            Legacy-Modus: Balken sind die gelieferten Δ-Werte, Linie ist der 7-Tage-Durchschnitt dieser Δ.
          </>
        )}
      </div>
    </div>
  );
}

export default TrustTankHistoryChart;
