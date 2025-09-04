'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSession } from 'next-auth/react';

// Schritt 2 & 3
import StepFormCurrent, { type FrequencyCurrent } from './StepFormCurrent';
import StepFormIdeal, { type FrequencyIdeal } from './StepFormIdeal';

/* ===== Mini‑Banner für die prominente Anzeige ===== */
const SummaryBanner: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-black">{label}</div>
      <div className="text-sm font-semibold text-black">{value.toFixed(1)} / 10</div>
    </div>
    <div className="mt-2 h-2 w-full rounded bg-gray-100">
      <div
        className="h-2 rounded bg-black"
        style={{ width: `${(value / 10) * 100}%` }}
        aria-label={`${value} von 10`}
      />
    </div>
  </div>
);

/* ==================== Chip-Optionen (Step 0) ==================== */
type ChipOption = { label: string; color: string; weight?: number };

const EMOTIONS: ChipOption[] = [
  { label: 'Ruhig', color: 'bg-blue-100 text-blue-800', weight: +0.4 },
  { label: 'Sicher', color: 'bg-emerald-100 text-emerald-800', weight: +0.5 },
  { label: 'Gelassen', color: 'bg-teal-100 text-teal-800', weight: +0.3 },
  { label: 'Aufgeregt', color: 'bg-orange-100 text-orange-800', weight: -0.1 },
  { label: 'Unsicher', color: 'bg-gray-200 text-gray-900', weight: -0.6 },
  { label: 'Unkonzentriert', color: 'bg-yellow-100 text-yellow-800', weight: -0.5 },
  { label: 'Frustriert', color: 'bg-rose-100 text-rose-800', weight: -0.6 },
  { label: 'Ängstlich', color: 'bg-indigo-100 text-indigo-800', weight: -0.7 },
  { label: 'Genervt', color: 'bg-red-100 text-red-800', weight: -0.4 },
  { label: 'Übermütig', color: 'bg-fuchsia-100 text-fuchsia-800', weight: -0.2 },
  { label: 'FOMO', color: 'bg-pink-100 text-pink-800', weight: -0.6 },
  { label: 'Tilt', color: 'bg-purple-100 text-purple-800', weight: -0.8 },
];

const SELF_VIEW: ChipOption[] = [
  { label: 'Ich handle identitätskongruent', color: 'bg-emerald-100 text-emerald-800', weight: +0.7 },
  { label: 'Fokussiert', color: 'bg-blue-100 text-blue-800', weight: +0.4 },
  { label: 'Diszipliniert', color: 'bg-teal-100 text-teal-800', weight: +0.5 },
  { label: 'Reaktiv', color: 'bg-orange-100 text-orange-800', weight: -0.3 },
  { label: 'Zerstreut', color: 'bg-yellow-100 text-yellow-800', weight: -0.4 },
  { label: 'Selbstsicher', color: 'bg-teal-100 text-teal-800', weight: +0.3 },
  { label: 'Zögerlich', color: 'bg-gray-200 text-gray-900', weight: -0.3 },
  { label: 'Aggressiv', color: 'bg-red-100 text-red-800', weight: -0.4 },
  { label: 'Konservativ', color: 'bg-indigo-100 text-indigo-800', weight: +0.1 },
  { label: 'Überanalytisch', color: 'bg-fuchsia-100 text-fuchsia-800', weight: -0.1 },
];

const FOCUS_LEAKS: ChipOption[] = [
  { label: 'Social Media', color: 'bg-pink-100 text-pink-800', weight: -0.5 },
  { label: 'Benachrichtigungen', color: 'bg-purple-100 text-purple-800', weight: -0.4 },
  { label: 'Multitasking', color: 'bg-yellow-100 text-yellow-800', weight: -0.5 },
  { label: 'News/Feeds', color: 'bg-blue-100 text-blue-800', weight: -0.3 },
  { label: 'Müdigkeit', color: 'bg-gray-200 text-gray-900', weight: -0.6 },
  { label: 'Hunger', color: 'bg-amber-100 text-amber-800', weight: -0.4 },
  { label: 'Umgebungsgeräusche', color: 'bg-lime-100 text-lime-800', weight: -0.2 },
  { label: 'Prokrastination', color: 'bg-rose-100 text-rose-800', weight: -0.6 },
  { label: 'Overthinking', color: 'bg-teal-100 text-teal-800', weight: -0.3 },
  { label: 'Kontextwechsel', color: 'bg-indigo-100 text-indigo-800', weight: -0.4 },
];

const DEFAULT_REACTIONS: ChipOption[] = [
  { label: 'Zu schnell aufgeben', color: 'bg-amber-100 text-amber-800', weight: -0.5 },
  { label: 'Zu lange zögern', color: 'bg-yellow-100 text-yellow-800', weight: -0.4 },
  { label: 'Überstürztes Handeln', color: 'bg-pink-100 text-pink-800', weight: -0.5 },
  { label: 'An Problemen festbeißen', color: 'bg-red-100 text-red-800', weight: -0.4 },
  { label: 'Entscheidungen vermeiden', color: 'bg-gray-200 text-gray-900', weight: -0.4 },
  { label: 'Zu viele Aufgaben gleichzeitig', color: 'bg-orange-100 text-orange-800', weight: -0.3 },
  { label: 'Pläne spontan ändern', color: 'bg-rose-100 text-rose-800', weight: -0.2 },
  { label: 'Übermäßige Kontrolle', color: 'bg-indigo-100 text-indigo-800', weight: -0.2 },
  { label: 'Bestätigung von außen suchen', color: 'bg-blue-100 text-blue-800', weight: -0.3 },
];

const EXPECTATIONS: ChipOption[] = [
  { label: 'Ich handle bereits als mein gewünschtes Selbst', color: 'bg-emerald-100 text-emerald-800', weight: +0.6 },
  { label: 'Prozess > Outcome (Schritt für Schritt)', color: 'bg-teal-100 text-teal-800', weight: +0.4 },
  { label: 'Täglicher Fortschritt', color: 'bg-blue-100 text-blue-800', weight: +0.2 },
  { label: 'Sofortige Ergebnisse', color: 'bg-orange-100 text-orange-800', weight: -0.5 },
  { label: 'Keine Rückschläge', color: 'bg-rose-100 text-rose-800', weight: -0.6 },
  { label: 'Immer fehlerfrei arbeiten', color: 'bg-indigo-100 text-indigo-800', weight: -0.5 },
  { label: 'Kein Fehltritt erlaubt', color: 'bg-red-100 text-red-800', weight: -0.6 },
];

/* ==================== UI-Atoms ==================== */
function Chip({
  label, selected, onClick, color,
}: { label: string; selected: boolean; onClick: () => void; color: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1 rounded-full text-xs font-medium border transition',
        selected ? 'border-black bg-black text-white' : `border-transparent ${color} hover:opacity-90`,
      ].join(' ')}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

function MultiSelectSection({
  title, options, value, onChange,
}: { title: string; options: ChipOption[]; value: string[]; onChange: (next: string[]) => void }) {
  function toggle(label: string) {
    onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label]);
  }
  return (
    <section>
      <h4 className="text-sm font-medium mb-2 text-black">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip
            key={opt.label}
            label={opt.label}
            color={opt.color}
            selected={value.includes(opt.label)}
            onClick={() => toggle(opt.label)}
          />
        ))}
      </div>
    </section>
  );
}

/* ===== Conviction‑Vorschau (0–10) ===== */
function computeConvictionPreview({
  baseConviction,
  selfView,
  emotion,
  focusLeaks,
  defaultReactions,
  expectations,
}: {
  baseConviction: number;
  selfView: string[];
  emotion: string[];
  focusLeaks: string[];
  defaultReactions: string[];
  expectations: string[];
}) {
  const weightOf = (arr: ChipOption[]) => (label: string) => arr.find(o => o.label === label)?.weight ?? 0;

  let score = baseConviction;
  score += emotion.reduce((s, l) => s + weightOf(EMOTIONS)(l), 0);
  score += selfView.reduce((s, l) => s + weightOf(SELF_VIEW)(l), 0);
  score += expectations.reduce((s, l) => s + weightOf(EXPECTATIONS)(l), 0);
  score += focusLeaks.reduce((s, l) => s + weightOf(FOCUS_LEAKS)(l), 0);
  score += defaultReactions.reduce((s, l) => s + weightOf(DEFAULT_REACTIONS)(l), 0);

  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}

/* ==================== Step 4: DOs/DON’Ts ==================== */
function DailyTaskSetup({
  onBack,
  onFinish,
  disabled,
  saving,
}: {
  onBack: () => void;
  onFinish: (data: {
    dos: { name: string; points?: number }[];
    donts: { name: string; points?: number }[];
  }) => void;
  disabled?: boolean;
  saving?: boolean;
}) {
  type TaskItem = { id: string; name: string; points?: number };

  const rnd = () =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2));

  const [dos, setDos] = React.useState<TaskItem[]>([]);
  const [donts, setDonts] = React.useState<TaskItem[]>([]);

  const [doName, setDoName] = React.useState('');
  const [doPoints, setDoPoints] = React.useState<string>('');
  const [dontName, setDontName] = React.useState('');
  const [dontPoints, setDontPoints] = React.useState<string>('');

  const clampPoints = (v: string): number | undefined => {
    if (v === '') return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.min(10, Math.round(n)));
  };

  const addDo = () => {
    const name = doName.trim();
    if (!name) return;
    setDos((prev) => [...prev, { id: rnd(), name, points: clampPoints(doPoints) }]);
    setDoName('');
    setDoPoints('');
  };

  const addDont = () => {
    const name = dontName.trim();
    if (!name) return;
    setDonts((prev) => [...prev, { id: rnd(), name, points: clampPoints(dontPoints) }]);
    setDontName('');
    setDontPoints('');
  };

  const remove = (which: 'dos' | 'donts', id: string) => {
    if (which === 'dos') setDos((p) => p.filter((x) => x.id !== id));
    else setDonts((p) => p.filter((x) => x.id !== id));
  };

  const hasTasks = dos.length + donts.length > 0;
  const finalDisabled = disabled || saving || !hasTasks;

  const Pill: React.FC<{ item: TaskItem; isDont?: boolean; onRemove: () => void }> = ({ item, isDont, onRemove }) => (
    <div
      className={[
        'flex items-center gap-2 px-2 py-1 rounded border',
        isDont ? 'ring-1 ring-red-300' : 'ring-1 ring-blue-200',
      ].join(' ')}
    >
      {isDont && <span aria-hidden>⚠️</span>}
      <span className="text-sm">{item.name}</span>
      <span
        className={[
          'text-[10px] px-1.5 py-0.5 rounded',
          isDont ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700',
        ].join(' ')}
      >
        {isDont ? '-' : '+'}
        {typeof item.points === 'number' ? item.points : 1} P
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 text-xs text-gray-500 hover:text-red-600"
        aria-label="Entfernen"
        title="Entfernen"
      >
        ✕
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2 text-black">Daily-Tasks festlegen</h2>
      <p className="text-sm text-gray-700 mb-4">
        Füge deine täglichen <strong>DOs</strong> und <strong>DON’Ts</strong> hinzu. Punkte wirken als Gewichtung (0–10).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DOs */}
        <div>
          <h3 className="font-medium text-black mb-2">DOs</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              autoComplete="off"
              className="flex-1 border rounded px-2 py-2 text-black bg-white"
              placeholder="z. B. 15 Min Fokusarbeit"
              value={doName}
              onChange={(e) => setDoName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDo();
                }
              }}
            />
            <input
              type="number"
              min={0}
              max={10}
              inputMode="numeric"
              className="w-28 border rounded px-2 py-2 text-black bg-white"
              placeholder="Punkte"
              value={doPoints}
              onChange={(e) => setDoPoints(e.target.value)}
            />
            <button
              type="button"
              onClick={addDo}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Hinzufügen
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {dos.length ? (
              dos.map((it) => <Pill key={it.id} item={it} onRemove={() => remove('dos', it.id)} />)
            ) : (
              <div className="text-xs text-gray-500">Noch keine DOs hinzugefügt.</div>
            )}
          </div>
        </div>

        {/* DON'Ts */}
        <div>
          <h3 className="font-medium text-black mb-2">DON’Ts</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              autoComplete="off"
              className="flex-1 border rounded px-2 py-2 text-black bg-white"
              placeholder="z. B. Doomscrolling"
              value={dontName}
              onChange={(e) => setDontName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDont();
                }
              }}
            />
            <input
              type="number"
              min={0}
              max={10}
              inputMode="numeric"
              className="w-28 border rounded px-2 py-2 text-black bg-white"
              placeholder="Punkte"
              value={dontPoints}
              onChange={(e) => setDontPoints(e.target.value)}
            />
            <button
              type="button"
              onClick={addDont}
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Hinzufügen
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {donts.length ? (
              donts.map((it) => <Pill key={it.id} item={it} isDont onRemove={() => remove('donts', it.id)} />)
            ) : (
              <div className="text-xs text-gray-500">Noch keine DON’Ts hinzugefügt.</div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button type="button" onClick={onBack} className="px-3 py-2 rounded border hover:bg-gray-50">
          Zurück
        </button>
        <button
          type="button"
          disabled={finalDisabled}
          onClick={() =>
            onFinish({
              dos: dos.map(({ name, points }) => ({ name: name.trim(), points })),
              donts: donts.map(({ name, points }) => ({ name: name.trim(), points })),
            })
          }
          className={`px-3 py-2 rounded ${
            finalDisabled ? 'bg-gray-200 text-gray-500' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saving ? 'Speichere…' : 'Abschließen'}
        </button>
      </div>
    </div>
  );
}

/* ==================== Types ==================== */
export type FrequencyBasePayload = {
  userId: string;
  baseFrequency: number;   // 0–10
  baseConviction: number;  // 0–10
  selfView: string[];
  emotion: string[];
  focusLeaks: string[];
  defaultReactions: string[];
  expectations: string[];
};

/* ==================== Haupt-Wizard ==================== */
export default function FrequencyOnboardingFlow({
  open,
  onOpenChange,
  onFinishedAll,
  userId: userIdProp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFinishedAll: () => void;
  userId?: string;
}) {
  const [step, setStep] = React.useState<0 | 1 | 2 | 3>(0);
  const { data: session } = useSession();
  const userId = userIdProp ?? (session as any)?.user?.id ?? '';

  // Step 0 (Basis)
  const [baseFrequency, setBaseFrequency] = React.useState(0);
  const [baseConviction, setBaseConviction] = React.useState(0);
  const [selfView, setSelfView] = React.useState<string[]>([]);
  const [emotion, setEmotion] = React.useState<string[]>([]);
  const [focusLeaks, setFocusLeaks] = React.useState<string[]>([]);
  const [defaultReactions, setDefaultReactions] = React.useState<string[]>([]);
  const [expectations, setExpectations] = React.useState<string[]>([]);

  // Step 1 & 2 (gesammelte Daten)
  const [current, setCurrent] = React.useState<Partial<FrequencyCurrent> | null>(null);
  const [ideal, setIdeal] = React.useState<Partial<FrequencyIdeal> | null>(null);

  // Status
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // vom StepFormCurrent berechnete Baseline + vollständiges Profil
  const [currentBase, setCurrentBase] = React.useState<{
    baseFrequency: number;
    profile: FrequencyCurrent;
  } | null>(null);

  const convictionPreview = computeConvictionPreview({
    baseConviction,
    selfView,
    emotion,
    focusLeaks,
    defaultReactions,
    expectations,
  });

  // finaler Submit (mit DOs & DON’Ts)
  async function handleFinishAll(tasksInput: { dos: { name: string; points?: number }[]; donts: { name: string; points?: number }[] }) {
    setErr(null);
    if (!userId) {
      setErr('Kein eingeloggter User – bitte anmelden.');
      return;
    }
    if (!currentBase) {
      setErr('Fehlende Baseline aus Schritt 2.');
      return;
    }
    if (!ideal) {
      setErr('Fehlendes Ziel-Modell aus Schritt 3.');
      return;
    }

    setSaving(true);
    try {
      // 1) Base
      const basePayload: FrequencyBasePayload = {
        userId,
        baseFrequency,
        baseConviction,
        selfView,
        emotion,
        focusLeaks,
        defaultReactions,
        expectations,
      };
      await fetch('/api/frequency/setBase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      // 2) Models
      await fetch('/api/frequency/setModels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, current, ideal }),
      });

      // 3) Tasks (DOs + DON'Ts)
      const normalize = (t: { name: string; points?: number }, isDont: boolean) => ({
        name: t.name.trim(),
        points: typeof t.points === 'number' ? t.points : 1,
        frequency: 'daily' as const,
        timebased: false,
        category: 'Frequenz',
        isFrequencyTask: true,
        isDont,
      });

      const tasks = [
        ...tasksInput.dos.filter((t) => t.name.trim()).map((t) => normalize(t, false)),
        ...tasksInput.donts.filter((t) => t.name.trim()).map((t) => normalize(t, true)),
      ];

      if (tasks.length) {
        await fetch('/api/frequency/bulkCreateDaily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, tasks }),
        });
      }

      onFinishedAll();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      setErr('Speichern fehlgeschlagen. Bitte später erneut versuchen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); }}>
      {/*
        Kontrast-Fix: Erzwinge dunkle Grundfarbe + dunkle Headings innerhalb des Dialogs.
        Damit sind h1/h2/h3/h4 auch bei globalem "text-white" Theme sichtbar.
      */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0 bg-white shadow-xl rounded-lg text-gray-900 [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_h4]:text-gray-900 [&_p]:text-gray-900">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-black">
            {step === 0 && 'Frequenz – Basis'}
            {step === 1 && 'Aktuelle Frequenz'}
            {step === 2 && 'Ziel-Frequenz'}
            {step === 3 && 'Daily-Tasks'}
          </DialogTitle>
        </DialogHeader>

        {/* Hinweis-Box */}
        {!userId && (
          <div className="mx-5 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            Kein User erkannt. Bitte einloggen oder <code>userId</code> als Prop an den Onboarding-Dialog übergeben.
          </div>
        )}
        {err && (
          <div className="mx-5 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {err}
          </div>
        )}

        {/* Inhalt */}
        <div className="px-5 pb-5 overflow-y-auto max-h-[74vh] space-y-6">
          {step === 0 && (
            <>
              {/* ======= Sichtbare Live‑Anzeige direkt im ersten Slide ======= */}
              <section className="space-y-3">
                <SummaryBanner
                  label="Momentane Conviction (berechnet)"
                  value={convictionPreview}
                />
              </section>


              {/* Conviction + kleine Live-Badge */}
              <section>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium mb-1 text-black">
                    Base Conviction / Grundsicherheit (0–10)
                  </label>
                  <div className="text-xs px-2 py-1 rounded-full bg-black text-white">
                    Live: <b>{convictionPreview}</b>/10
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={baseConviction}
                    onChange={(e) => setBaseConviction(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="w-8 text-right text-black">{baseConviction}</span>
                </div>
              </section>

              {/* Identität */}
              <MultiSelectSection title="Identität & Selbstbild" options={SELF_VIEW} value={selfView} onChange={setSelfView} />
              {/* Emotionen */}
              <MultiSelectSection title="Emotionaler Grundzustand" options={EMOTIONS} value={emotion} onChange={setEmotion} />
              {/* Leaks */}
              <MultiSelectSection title="Leaks (Energie/Attention‑Abflüsse)" options={FOCUS_LEAKS} value={focusLeaks} onChange={setFocusLeaks} />
              {/* Reaktionen */}
              <MultiSelectSection title="Standard‑Reaktionen unter Druck" options={DEFAULT_REACTIONS} value={defaultReactions} onChange={setDefaultReactions} />
              {/* Erwartungen */}
              <MultiSelectSection title="Erwartungen / Regeln" options={EXPECTATIONS} value={expectations} onChange={setExpectations} />

              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(1)} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                  Weiter
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <StepFormCurrent
              userId={userId || ''}
              deferApi
              value={current ?? undefined}
              onChange={(patch: any) => setCurrent((prev) => ({ ...(prev ?? {}), ...patch }))}
              onSavedBase={(data) => setCurrentBase(data)}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepFormIdeal
              userId={userId || ''}
              value={ideal ?? undefined}
              onChange={(patch) => setIdeal((prev) => ({ ...(prev ?? {}), ...patch }))}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <DailyTaskSetup
              onBack={() => setStep(2)}
              onFinish={handleFinishAll}
              disabled={!userId}
              saving={saving}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   OPTIONAL: Dialog zum späteren Bearbeiten von DOs/DON’Ts
   Nutzung:
   <FrequencyTasksDialog open={open} onOpenChange={setOpen} userId={userId} />
   ============================================================ */
export function FrequencyTasksDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
}) {
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function saveFrequencyTasks(dos: { name: string; points?: number }[], donts: { name: string; points?: number }[]) {
    const normalize = (t: { name: string; points?: number }, isDont: boolean) => ({
      name: t.name.trim(),
      points: typeof t.points === 'number' ? t.points : 1,
      frequency: 'daily' as const,
      timebased: false,
      category: 'Frequenz',
      isFrequencyTask: true,
      isDont,
    });

    const tasks = [
      ...dos.filter((t) => t.name.trim()).map((t) => normalize(t, false)),
      ...donts.filter((t) => t.name.trim()).map((t) => normalize(t, true)),
    ];

    if (!tasks.length) return;
    await fetch('/api/frequency/bulkCreateDaily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tasks }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Kontrast-Fix auch hier erzwingen */}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden p-0 bg-white shadow-xl rounded-lg text-gray-900 [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_h4]:text-gray-900 [&_p]:text-gray-900">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-black">Frequenz-Tasks bearbeiten</DialogTitle>
        </DialogHeader>

        {err && (
          <div className="mx-5 mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {err}
          </div>
        )}

        <div className="px-5 pb-5 overflow-y-auto max-h-[74vh]">
          <DailyTaskSetup
            onBack={() => onOpenChange(false)}
            disabled={!userId}
            saving={saving}
            onFinish={async (data) => {
              try {
                setErr(null);
                setSaving(true);
                await saveFrequencyTasks(data.dos, data.donts);
                onOpenChange(false);
              } catch (e) {
                console.error(e);
                setErr('Speichern fehlgeschlagen. Bitte später erneut versuchen.');
              } finally {
                setSaving(false);
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
