'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

type SeriesPoint = { date: string; taskScore?: number; convTarget?: number; moodAvg?: number };

function fmtDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}.${m}.`;
}

function movingAvg(arr: number[], window = 7) {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = Number.isFinite(arr[i]) ? arr[i] : NaN;
    sum += v;
    if (i >= window) sum -= Number.isFinite(arr[i - window]) ? arr[i - window] : NaN;
    if (i >= window - 1) {
      const a = sum / window;
      out.push(Number.isFinite(a) ? a : null);
    } else {
      out.push(null);
    }
  }
  return out;
}

export default function FrequencyDayChart({
  userId,
  days = 28,
  end,
  title = 'Daily Frequency (Score %)',
  onRunRollup, // optional: zeigt Button im Empty-State
}: {
  userId: string;
  days?: 7 | 14 | 28;
  end?: string;
  title?: string;
  onRunRollup?: () => void;
}) {
  const [series, setSeries] = React.useState<SeriesPoint[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!userId) return;
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const q = new URLSearchParams({
          userId,
          days: String(days),
          ...(end ? { end } : {}),
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
  }, [userId, days, end]);

  // EMPTY-STATE: keine Daten
  const isEmpty = !loading && !error && series.length === 0;

  const values = series.map((p) => (typeof p.taskScore === 'number' ? p.taskScore : NaN));
  const ma7 = movingAvg(values, 7);

  const data = series.map((p, i) => ({
    date: p.date,
    score: Number.isFinite(values[i]) ? values[i] : undefined,
    ma7: Number.isFinite(ma7[i] ?? NaN) ? (ma7[i] as number) : undefined,
  }));

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {loading ? (
          <span className="text-[10px] text-gray-500">Lade…</span>
        ) : error ? (
          <span className="text-[10px] text-rose-600">{error}</span>
        ) : (
          <span className="text-[10px] text-gray-500">Letzte {days} Tage</span>
        )}
      </div>

      {/* EMPTY-STATE UI */}
      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-gray-600 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium text-gray-800 mb-1">Noch keine Tageswerte vorhanden.</div>
            <div>
              Erledige heute ein paar DOs/DON’Ts oder führe einmal das tägliche Rollup aus, um die ersten
              Punkte zu sehen.
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
          <LineChart data={data}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey="date" tickFormatter={fmtDate} />
            <YAxis domain={[0, 100]} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(v: any, key: string) =>
                key === 'ma7' ? [`${Number(v).toFixed(1)}%`, '7T Ø'] : [`${Number(v).toFixed(1)}%`, 'Score']
              }
              labelFormatter={(l) => `Datum: ${l}`}
            />
            <ReferenceLine y={50} stroke="#9ca3af" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="score" name="Score" stroke="#111827" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ma7" name="7T Ø" stroke="#4b5563" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <p className="mt-2 text-[11px] text-gray-600">
        Score = Tages-Frequenz (0–100) aus deinen DO/DON’T-Erledigungen. Die graue Linie zeigt den rollierenden
        7-Tage-Durchschnitt.
      </p>
    </div>
  );
}
