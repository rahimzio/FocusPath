'use client';

import { useEffect, useMemo, useState } from 'react';

interface Props {
  userId: string;
  /** optional, wird aktuell nur zur Anzeige verwendet (toggle API schreibt auf "heute") */
  date: string;
}

type DontItem = {
  name: string;
  points: number;
  isDont: true;
  /** didAvoid = true → NICHT getan (gut) / false → getan (schlecht) */
  didAvoid: boolean;
};

export default function AvoidChecklist({ userId, date }: Props) {
  const [items, setItems] = useState<DontItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ userId, date }).toString();
      const r = await fetch(`/api/frequency/overview?${q}`);
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      const todayTasks = Array.isArray(j.todayTasks) ? j.todayTasks : [];
      const donts = todayTasks
        .filter((t: any) => !!t.isDont)
        .map((t: any) => ({
          name: t.name,
          points: Math.max(1, Number(t.points) || 1),
          isDont: true as const,
          // status === 'done' bedeutet: DON'T getan (schlecht) → didAvoid = false
          didAvoid: t.status !== 'done',
        })) as DontItem[];

      setItems(donts);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const allAvoided = useMemo(() => items.length && items.every((i) => i.didAvoid), [items]);

  async function toggle(name: string, nextDidAvoid: boolean) {
    const it = items.find((x) => x.name === name);
    if (!it) return;
    setSavingKey(name);
    setError(null);
    try {
      // Mapping: didAvoid === true → Task bleibt "open"
      // didAvoid === false → Task wird "done" (DON'T verfehlt)
      const done = !nextDidAvoid;

      const r = await fetch('/api/frequency/toggleTaskStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: it.name, points: it.points, isDont: true, done }),
      });
      const j = await r.json();
      if (!j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);

      // Sofort UI aktualisieren
      setItems((prev) =>
        prev.map((x) => (x.name === name ? { ...x, didAvoid: nextDidAvoid } : x)),
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="p-4 rounded-lg border bg-white">
        <div className="text-sm text-gray-600">Lade DON’Ts…</div>
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border bg-white">
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">🚫 Dinge vermeiden (heute)</h3>
          <div className="text-[11px] text-gray-500">Datum: {date}</div>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          „Vermeiden“ = DON’T nicht getan. Umschalten aktualisiert sofort deine heutige Vorschau.
        </p>
      </div>

      <div className="px-4 py-3 space-y-3">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{item.name}</span>
              <span className="text-[10px] text-red-600">-{item.points} P</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={item.didAvoid}
                  disabled={savingKey === item.name}
                  onChange={(e) => toggle(item.name, e.target.checked)}
                  aria-label={`${item.name} vermeiden`}
                />
                vermeiden
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 flex items-center justify-between">
        <button
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
          onClick={load}
          title="Aktualisieren"
        >
          Aktualisieren
        </button>
        <div className="text-[11px]">
          {allAvoided ? (
            <span className="text-emerald-600">Stark – alle DON’Ts vermieden!</span>
          ) : (
            <span className="text-gray-600">Einzelne Ausrutscher sind ok – wichtig ist die Linie.</span>
          )}
        </div>
      </div>

      {error && <div className="px-4 pb-4 text-[11px] text-rose-600">{error}</div>}
    </div>
  );
}
