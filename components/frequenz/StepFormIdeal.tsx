'use client'
import React, { useEffect, useState } from 'react'

export type FrequencyIdeal = {
  convictionTarget: number // 0–10
  desiredIdentity: string[]
  desiredEmotions: string[]
  desiredFocus: string[]
  responsePattern: string[]
  expectationsIdeal: string[]
  microEvidencePlan: string[]
}

type PropsIdeal = {
  userId: string
  currentModel?: any
  onFinish?: () => void
  createDailyTasks?: boolean
  value?: Partial<FrequencyIdeal>
  onChange: (next: Partial<FrequencyIdeal>) => void
  onBack: () => void
  onNext: () => void
  deferApi?: boolean
  onSaveIdeal?: (ideal: FrequencyIdeal) => void
}

const DESIRED_IDENTITY = [
  { label: 'Konsequent', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'Proaktiv', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { label: 'Gelassen', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  { label: 'Neugierig', color: 'bg-violet-100 text-violet-900 border-violet-200' },
  { label: 'Selbstwirksam', color: 'bg-lime-100 text-lime-900 border-lime-200' },
]

const DESIRED_EMOTIONS = [
  { label: 'Ruhig', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  { label: 'Sicher', color: 'bg-green-100 text-green-900 border-green-200' },
  { label: 'Dankbar', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'Energievoll', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Zuversichtlich', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
]

const DESIRED_FOCUS = [
  { label: 'Deep Work', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { label: 'Single-Tasking', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'Intentional Media', color: 'bg-teal-100 text-teal-900 border-teal-200' },
  { label: 'Regelmäßige Pausen', color: 'bg-lime-100 text-lime-900 border-lime-200' },
  { label: 'Vorbereitung am Vortag', color: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200' },
]

const RESPONSE_PATTERN = [
  { label: '3 tiefe Atemzüge', color: 'bg-slate-100 text-slate-900 border-slate-200' },
  { label: '5-Minuten-Start', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'Re-Focus Routine', color: 'bg-cyan-100 text-cyan-900 border-cyan-200' },
  { label: 'Schritt klein machen', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  { label: 'Selbstgespräch positiv', color: 'bg-pink-100 text-pink-900 border-pink-200' },
]

const EXPECTATIONS_IDEAL = [
  { label: 'Plan vor Ergebnis', color: 'bg-lime-100 text-lime-900 border-lime-200' },
  { label: 'Fortschritt > Perfektion', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { label: 'Fehler = Feedback', color: 'bg-indigo-100 text-indigo-900 border-indigo-200' },
  { label: 'Konstanz zählt', color: 'bg-blue-100 text-blue-900 border-blue-200' },
]

const MICRO_ACTIONS = [
  { label: '15 Min Fokusarbeit', color: 'bg-blue-100 text-blue-900 border-blue-200' },
  { label: '3× Dankbarkeit', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { label: 'Kurze Pause jede Stunde', color: 'bg-green-100 text-green-900 border-green-200' },
  { label: '10 Min Bewegung', color: 'bg-orange-100 text-orange-900 border-orange-200' },
  { label: 'Abend-Review & Planung', color: 'bg-purple-100 text-purple-900 border-purple-200' },
  { label: 'Tägliche Reflexion', color: 'bg-pink-100 text-pink-900 border-pink-200' },
]

function Chip({ selected, onClick, className, children }: { selected?: boolean; onClick?: () => void; className?: string; children: React.ReactNode }){
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1 rounded-full text-sm border transition ${selected ? 'ring-2 ring-green-500 border-green-300' : 'hover:opacity-90 border-gray-200'} ${className}`} aria-pressed={selected}>
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

export function toModelsPatch(ideal: FrequencyIdeal){
  return {
    current: undefined,
    ideal,
  }
}

const defaultsIdeal: FrequencyIdeal = {
  convictionTarget: 8,
  desiredIdentity: [],
  desiredEmotions: [],
  desiredFocus: [],
  responsePattern: [],
  expectationsIdeal: [],
  microEvidencePlan: [],
}

export default function StepFormIdeal({ userId, currentModel, onFinish, createDailyTasks = true, value, onChange, onBack, onNext, deferApi = true, onSaveIdeal }: PropsIdeal){
  const [v, setV] = useState<FrequencyIdeal>({ ...defaultsIdeal, ...(value ?? {}) })

  useEffect(() => { if (value) setV((prev) => ({ ...prev, ...value })) }, [value])

  const patch = (p: Partial<FrequencyIdeal>) => setV((prev) => { const next = { ...prev, ...p }; onChange(next); return next })

  const toggle = (key: keyof FrequencyIdeal, label: string) => setV((prev) => {
    const arr = new Set([...(prev[key] as string[])])
    arr.has(label) ? arr.delete(label) : arr.add(label)
    const next = { ...prev, [key]: Array.from(arr) } as FrequencyIdeal
    onChange(next); return next
  })

  async function saveModels(){
    if (deferApi){ onSaveIdeal?.(v); onNext(); return }

    try{
      await fetch('/api/frequency/setModels', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, current: currentModel ?? null, ideal: v }) })

      if (createDailyTasks){
        const tasks = [
          ...v.responsePattern.map((name) => ({ name, points: 5, isDont: false, frequency: 'daily' as const, timebased: false, category: 'Frequenz' })),
          ...(v.desiredFocus.includes('Vorbereitung am Vortag') ? [{ name: 'Abend‑Review & Planung (10 min)', points: 6, isDont:false, frequency:'daily' as const, timebased:false, category:'Frequenz' }] : []),
          ...(v.desiredEmotions.includes('Dankbar') ? [{ name: '3× Dankbarkeit notieren', points: 4, isDont:false, frequency:'daily' as const, timebased:false, category:'Mindset' }] : []),
        ]
        if (tasks.length){
          await fetch('/api/frequency/bulkCreateDaily', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, tasks }) })
        }
      }
      onFinish?.()
    }catch(e){
      console.error('StepFormIdeal fallback save failed', e)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Ziel‑Frequenz</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900">Ziel‑Überzeugung / Sicherheit (0–10)</label>
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={10} value={v.convictionTarget} onChange={(e) => patch({ convictionTarget: Number(e.target.value) })} className="flex-1" />
            <span className="w-8 text-right font-medium text-gray-900">{v.convictionTarget}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Gewünschte Identität</p>
          <ChipGroup options={DESIRED_IDENTITY} selected={v.desiredIdentity} onToggle={(l) => toggle('desiredIdentity', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Gewünschte Emotionen</p>
          <ChipGroup options={DESIRED_EMOTIONS} selected={v.desiredEmotions} onToggle={(l) => toggle('desiredEmotions', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Gewünschter Fokus</p>
          <ChipGroup options={DESIRED_FOCUS} selected={v.desiredFocus} onToggle={(l) => toggle('desiredFocus', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Response‑Pattern</p>
          <ChipGroup options={RESPONSE_PATTERN} selected={v.responsePattern} onToggle={(l) => toggle('responsePattern', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Erwartungen (Ideal)</p>
          <ChipGroup options={EXPECTATIONS_IDEAL} selected={v.expectationsIdeal} onToggle={(l) => toggle('expectationsIdeal', l)} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2 text-gray-900">Kernaktionen für deine ideale Frequenz</p>
          <ChipGroup options={MICRO_ACTIONS} selected={v.microEvidencePlan} onToggle={(l) => toggle('microEvidencePlan', l)} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="px-3 py-2 rounded border hover:bg-gray-50">Zurück</button>
        <button type="button" onClick={saveModels} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">Weiter</button>
      </div>
    </div>
  )
}
