'use client';

import React, { useMemo, useState } from "react";
import { calculateTrustPoints } from "@/utils/frequenz/calculateTrustPoints";
import { toast } from "react-toastify";

type DoItem = { name: string; points?: number };

interface EveningReflectionCheckProps {
  userId: string;
  date: string; // "YYYY-MM-DD"
  forbiddenBehaviors: string[];
  dos?: DoItem[];
  onSubmit?: (payload: any) => void;
}

const EMOTIONS = ["Ruhig","Sicher","Gelassen","Dankbar","Energievoll","Zuversichtlich","Gestresst","Genervt","Müde"];
const FOCUS_LEAKS = ["Social Media","Benachrichtigungen","Multitasking","News/Feeds","Overthinking","Prokrastination"];

const chip = (active: boolean) =>
  `px-3 py-1 rounded-full text-xs border ${active ? "bg-black text-white border-black" : "bg-white text-black border-gray-300 hover:bg-gray-50"}`;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-white p-4 rounded-lg border shadow-sm">
    <h3 className="text-sm font-semibold mb-3">{title}</h3>
    {children}
  </section>
);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const EveningReflectionCheck: React.FC<EveningReflectionCheckProps> = ({
  userId,
  date,
  forbiddenBehaviors,
  dos = [],
  onSubmit,
}) => {
  const [dontsMap, setDontsMap] = useState<Record<string, boolean>>({});
  const [dosMap, setDosMap] = useState<Record<string, boolean>>({});

  const [emotions, setEmotions] = useState<string[]>([]);
  const [leaks, setLeaks] = useState<string[]>([]);
  const [energy, setEnergy] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(3);
  const [deepWorkMin, setDeepWorkMin] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const doDelta = useMemo(() => {
    return dos.reduce((sum, d) => sum + ((dosMap[d.name] ? (d.points ?? 1) : 0)), 0);
  }, [dos, dosMap]);

  const { delta: dontDelta, details: dontDetails } = useMemo(() => {
    return calculateTrustPoints(dontsMap);
  }, [dontsMap]);

  const totalDelta = dontDelta + doDelta;

  const frequencyPreview = useMemo(() => {
    const denom = dos.reduce((s, d) => s + Math.max(1, d.points ?? 1), 0) + forbiddenBehaviors.length * 1;
    if (!denom) return 0;
    let numer = 0;
    for (const d of dos) {
      const w = Math.max(1, d.points ?? 1);
      if (dosMap[d.name]) numer += w;
    }
    for (const name of forbiddenBehaviors) {
      const v = dontsMap[name];
      if (v === true) numer += 1;
      else if (v === false) numer -= 1;
    }
    return Math.round(clamp((numer / denom) * 100, 0, 100));
  }, [dos, dosMap, forbiddenBehaviors, dontsMap]);

  function toggleArr(state: string[], set: (x: string[]) => void, v: string) {
    set(state.includes(v) ? state.filter(x => x !== v) : [...state, v]);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !date) {
      toast.error("Fehlende Daten (userId/Datum).");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId,
        date,
        delta: totalDelta,
        details: {
          donts: dontDetails,
          dosDone: Object.keys(dosMap).filter(k => !!dosMap[k]).map(name => ({
            name,
            points: dos.find(d => d.name === name)?.points ?? 1,
          })),
        },
        snapshot: {
          emotions,
          leaks,
          energy: clamp(energy, 1, 5),
          sleep: clamp(sleep, 1, 5),
          deepWorkMin: Math.max(0, Math.round(deepWorkMin)),
        },
      };

      const res = await fetch("/api/frequency/saveEveningReflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      onSubmit?.(payload);
      toast.success(`Reflexion gespeichert. Trust: ${totalDelta >= 0 ? '+' : ''}${totalDelta}`);

      // soft reset
      setDontsMap({});
      setDosMap({});
      setEmotions([]);
      setLeaks([]);
      setEnergy(3);
      setSleep(3);
      setDeepWorkMin(0);
    } catch (err:any) {
      console.error(err);
      toast.error("Fehler beim Speichern der Reflexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-base font-semibold mb-1 text-gray-800">Abendlicher Frequenz-Check</h2>
      <p className="text-xs text-gray-500 mb-2">Datum: {new Date(date).toLocaleDateString("de-DE")}</p>

      {/* DON’Ts */}
      <Section title="DON’Ts (heute vermieden?)">
        {forbiddenBehaviors.length === 0 ? (
          <p className="text-sm text-gray-500">Keine DON’Ts definiert.</p>
        ) : (
          <fieldset className="space-y-3">
            <legend className="sr-only">DON’Ts</legend>
            {forbiddenBehaviors.map((b) => (
              <div key={b} className="flex flex-col gap-1">
                <span className="text-sm font-medium">{b}</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`dont-${b}`}
                      checked={dontsMap[b] === true}
                      onChange={() => setDontsMap(prev => ({ ...prev, [b]: true }))}
                    />
                    nicht getan ✅
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`dont-${b}`}
                      checked={dontsMap[b] === false}
                      onChange={() => setDontsMap(prev => ({ ...prev, [b]: false }))}
                    />
                    getan ❌
                  </label>
                </div>
              </div>
            ))}
          </fieldset>
        )}
      </Section>

      {/* DOs */}
      <Section title="DOs (heute erledigt?)">
        {dos.length === 0 ? (
          <p className="text-sm text-gray-500">Keine DOs definiert.</p>
        ) : (
          <div className="space-y-2">
            {dos.map((d) => (
              <label key={d.name} className="flex items-center justify-between rounded border px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!dosMap[d.name]}
                    onChange={(e) => setDosMap(prev => ({ ...prev, [d.name]: e.target.checked }))}
                  />
                  <span className="text-sm">{d.name}</span>
                </div>
                <span className="text-xs text-gray-500">+{d.points ?? 1} P</span>
              </label>
            ))}
          </div>
        )}
        <div className="text-xs text-gray-600 mt-2">DO-Punkte heute: <strong>{doDelta}</strong></div>
      </Section>

      {/* Emotionen / Leaks */}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Emotionen heute">
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map(e => (
              <button type="button" key={e} className={chip(emotions.includes(e))} onClick={() => toggleArr(emotions, setEmotions, e)}>
                {e}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Fokus-Leaks aufgetreten">
          <div className="flex flex-wrap gap-2">
            {FOCUS_LEAKS.map(f => (
              <button type="button" key={f} className={chip(leaks.includes(f))} onClick={() => toggleArr(leaks, setLeaks, f)}>
                {f}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Section title="Energie">
          <input aria-label="Energie" type="range" min={1} max={5} value={energy} onChange={(e)=>setEnergy(Number(e.target.value))} className="w-full" />
          <div className="text-xs mt-1">Level: {energy}/5</div>
        </Section>
        <Section title="Schlaf">
          <input aria-label="Schlafqualität" type="range" min={1} max={5} value={sleep} onChange={(e)=>setSleep(Number(e.target.value))} className="w-full" />
          <div className="text-xs mt-1">Qualität: {sleep}/5</div>
        </Section>
        <Section title="Deep-Work (Min.)">
          <input
            type="number"
            min={0}
            step={5}
            value={deepWorkMin}
            onChange={(e)=>setDeepWorkMin(Number(e.target.value||0))}
            className="w-full border rounded px-2 py-1"
          />
        </Section>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm space-x-3">
          <span className="text-gray-600">Trust-Änderung:</span>
          <span className={`font-semibold ${totalDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalDelta >= 0 ? "+" : ""}{totalDelta}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">Frequenz-Preview:</span>
          <span className="font-semibold">{frequencyPreview}%</span>
        </div>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60">
          {loading ? "Speichere..." : "Reflexion abschließen"}
        </button>
      </div>
    </form>
  );
};

export default EveningReflectionCheck;
