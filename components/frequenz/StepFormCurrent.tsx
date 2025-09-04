'use client'
import React, { useEffect, useMemo, useState } from 'react'

export type FrequencyCurrent = {
  convictionNow: number // 0–10 (will become baseConviction)
  perceptionSelf: string[]
  emotionalState: string[]
  focusLeaks: string[]
  defaultReactions: string[]
  defaultExpectations: string[]
}

export type FrequencyBasePayload = {
  userId: string
  baseFrequency: number // 0–10
  baseConviction: number // 0–10
  selfView: string[]
  emotion: string[]
  focusLeaks: string[]
  defaultReactions: string[]
  expectations: string[]
}

type Props = {
  userId: string
  value?: Partial<FrequencyCurrent> | null
  onSavedBase?: (data: { baseFrequency: number; profile: FrequencyCurrent }) => void
  onChange?: (patch: Partial<FrequencyCurrent>) => void
  onBack?: () => void
  onNext?: () => void
  deferApi?: boolean
}

// ==== Chip-Daten (unchanged in content, improved contrast via borders) ====
const PERCEPTION_SELF = [
  { label: 'Fokussiert', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { label: 'Diszipliniert', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'Reaktiv', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'Zerstreut', color: 'bg-yellow-100 text-yellow-900 border-yellow-200' },
  { label: 'Selbstsicher', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
  { label: 'Zögerlich', color: 'bg-slate-100 text-slate-900 border-slate-200' },
  { label: 'Analytisch', color: 'bg-violet-100 text-violet-900 border-violet-200' },
]

const EMOTIONS = [
  { label: 'Ruhig', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  { label: 'Sicher', color: 'bg-green-100 text-green-900 border-green-200' },
  { label: 'Unsicher', color: 'bg-zinc-100 text-zinc-900 border-zinc-200' },
  { label: 'Aufgeregt', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Unkonzentriert', color: 'bg-yellow-100 text-yellow-900 border-yellow-200' },
  { label: 'Frustriert', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  { label: 'Ängstlich', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'Genervt', color: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200' },
  { label: 'Gelassen', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
]

const FOCUS_LEAKS = [
  { label: 'Social Media', color: 'bg-pink-100 text-pink-900 border-pink-200' },
  { label: 'Benachrichtigungen', color: 'bg-slate-100 text-slate-900 border-slate-200' },
  { label: 'Multitasking', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'News/Feeds', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { label: 'Müdigkeit', color: 'bg-gray-100 text-gray-900 border-gray-200' },
  { label: 'Hunger', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Prokrastination', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  { label: 'Overthinking', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'Kontextwechsel', color: 'bg-teal-100 text-teal-900 border-teal-200' },
  { label: 'Umgebungsgeräusche', color: 'bg-lime-100 text-lime-900 border-lime-200' },
]

const DEFAULT_REACTIONS = [
  { label: 'Hinauszögern', color: 'bg-yellow-100 text-yellow-900 border-yellow-200' },
  { label: 'Perfektionismus', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  { label: 'Vermeidung', color: 'bg-gray-100 text-gray-900 border-gray-200' },
  { label: 'Sich ablenken', color: 'bg-pink-100 text-pink-900 border-pink-200' },
  { label: 'Aufgeben bei Widerstand', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  { label: 'People Pleasing', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'Sich überfordern', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Kontrollzwang', color: 'bg-blue-100 text-blue-900 border-blue-200' },
]

const EXPECTATIONS = [
  { label: 'Sofortige Ergebnisse', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Immer 100% perfekt', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'Täglicher Fortschritt', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'Keine Fehler erlaubt', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  { label: 'Plan vor Ergebnis', color: 'bg-lime-100 text-lime-900 border-lime-200' },
  { label: 'Nie Rückschritte', color: 'bg-teal-100 text-teal-900 border-teal-200' },
]

function Chip({ selected, onClick, className, children }: { selected?: boolean; onClick?: () => void; className?: string; children: React.ReactNode }){
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm border transition ${selected ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:opacity-90 border-gray-200'} ${className}`}
      aria-pressed={selected}
    >
      {children}
    </button>
  )
}

function ChipGroup({ options, selected, onToggle }: { options: { label: string; color: string }[]; selected: string[]; onToggle: (label: string) => void }){
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.label} selected={selected.includes(o.label)} onClick={() => onToggle(o.label)} className={o.color}>
          {o.label}
        </Chip>
      ))}
    </div>
  )
}

// ===== Baseline-Formel -> 0–10 =====
function computeBaseline0to10(v: FrequencyCurrent): number {
  const positiveEmos = ['Ruhig', 'Sicher', 'Gelassen', 'Selbstsicher']
  const rigidExpectations = ['Immer 100% perfekt', 'Keine Fehler erlaubt', 'Nie Rückschritte', 'Sofortige Ergebnisse']

  const convictionScore100 = (v.convictionNow / 10) * 40
  const emoPosCount = v.emotionalState.filter((e) => positiveEmos.includes(e)).length
  const emoScore100 = Math.min(emoPosCount * 10, 20)
  const leaksPenalty100 = Math.min(v.focusLeaks.length * 4, 20)
  const reactivePenalty100 = Math.min(v.defaultReactions.length * 2.5, 10)
  const expectPenalty100 = Math.min(v.defaultExpectations.filter((e) => rigidExpectations.includes(e)).length * 5, 10)

  const raw100 = convictionScore100 + emoScore100 - leaksPenalty100 - reactivePenalty100 - expectPenalty100 + 40
  const clamped100 = Math.max(0, Math.min(100, Math.round(raw100)))
  return Math.round((clamped100 / 10) * 10) / 10 // 0–10 with one decimal
}

export function toBasePayload(userId: string, v: FrequencyCurrent): FrequencyBasePayload {
  return {
    userId,
    baseFrequency: computeBaseline0to10(v),
    baseConviction: Math.max(0, Math.min(10, Math.round(v.convictionNow))),
    selfView: v.perceptionSelf,
    emotion: v.emotionalState,
    focusLeaks: v.focusLeaks,
    defaultReactions: v.defaultReactions,
    expectations: v.defaultExpectations,
  }
}

const defaults: FrequencyCurrent = {
  convictionNow: 5,
  perceptionSelf: [],
  emotionalState: [],
  focusLeaks: [],
  defaultReactions: [],
  defaultExpectations: [],
}

export default function StepFormCurrent({ userId, value, onSavedBase, onChange, onBack, onNext, deferApi = true }: Props){
  const [v, setV] = useState<FrequencyCurrent>({ ...defaults, ...(value ?? {}) })

  useEffect(() => { if (value) setV((prev) => ({ ...prev, ...value })) }, [value])

  const baseFrequency = useMemo(() => computeBaseline0to10(v), [v])

  const propagate = (next: Partial<FrequencyCurrent>) => onChange?.(next)

  const toggle = (key: keyof FrequencyCurrent, label: string) => {
    setV((prev) => {
      const arr = new Set([...(prev[key] as string[])])
      arr.has(label) ? arr.delete(label) : arr.add(label)
      const next = { ...prev, [key]: Array.from(arr) } as FrequencyCurrent
      propagate({ [key]: next[key] } as Partial<FrequencyCurrent>)
      return next
    })
  }

  async function saveAndNext(){
    if (deferApi){
      onSavedBase?.({ baseFrequency, profile: v })
      onNext?.(); return
    }
    // Fallback: korrekte Felder posten
    const payload = toBasePayload(userId, v)
    await fetch('/api/frequency/setBase', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
    onNext?.()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Aktuelle Frequenz (Baseline)</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Aktuelle Überzeugung / Sicherheit (0–10)</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={10} value={v.convictionNow} onChange={(e) => {
              const val = Number(e.target.value)
              setV((p) => { const next = { ...p, convictionNow: val }; propagate({ convictionNow: val }); return next })
            }} className="flex-1" />
            <span className="w-8 text-right font-medium text-gray-900">{v.convictionNow}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Selbstwahrnehmung</p>
          <ChipGroup options={PERCEPTION_SELF} selected={v.perceptionSelf} onToggle={(l) => toggle('perceptionSelf', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Vorherrschender Emotionszustand</p>
          <ChipGroup options={EMOTIONS} selected={v.emotionalState} onToggle={(l) => toggle('emotionalState', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Fokus‑Leaks</p>
          <ChipGroup options={FOCUS_LEAKS} selected={v.focusLeaks} onToggle={(l) => toggle('focusLeaks', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Standard‑Reaktionen</p>
          <ChipGroup options={DEFAULT_REACTIONS} selected={v.defaultReactions} onToggle={(l) => toggle('defaultReactions', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Erwartungen (Default)</p>
          <ChipGroup options={EXPECTATIONS} selected={v.defaultExpectations} onToggle={(l) => toggle('defaultExpectations', l)} />
        </div>

        <div className="mt-2 p-3 rounded border bg-gray-50" aria-live="polite">
          <div className="text-sm text-gray-700">Berechnete Baseline‑Frequenz</div>
          <div className="text-2xl font-semibold text-gray-900">{baseFrequency.toFixed(1)} / 10</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} className="px-3 py-2 rounded border hover:bg-gray-50">Zurück</button>
        ) : <span />}
        <button type="button" onClick={saveAndNext} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Weiter</button>
      </div>
    </div>
  )
}