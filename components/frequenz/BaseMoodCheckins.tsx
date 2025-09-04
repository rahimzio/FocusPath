'use client'
import * as React from 'react'

type TimeOfDay = 'morning' | 'noon' | 'evening'

function toYMD(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}

export function BaseMoodCheckins({
  userId,
  availableMoods,
  defaultSelected = [] as string[],
  date: dateProp,
}: {
  userId: string
  availableMoods: string[]
  defaultSelected?: string[]
  /** optional, default: heute (lokal) */
  date?: string
}) {
  const date = dateProp && /\d{4}-\d{2}-\d{2}/.test(dateProp) ? dateProp : toYMD()

  const [morning, setMorning] = React.useState<string[]>(defaultSelected)
  const [noon, setNoon] = React.useState<string[]>(defaultSelected)
  const [evening, setEvening] = React.useState<string[]>(defaultSelected)

  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  // optionales Prefill (wenn du die API noch nicht hast, passiert einfach nichts)
  React.useEffect(() => {
    let abort = false
    ;(async () => {
      try {
        const q = new URLSearchParams({ userId, date }).toString()
        const r = await fetch(`/api/frequency/moodLogs?${q}`)
        if (!r.ok) return
        const j = await r.json()
        if (!j?.ok || abort) return
        if (Array.isArray(j.morning)) setMorning(j.morning)
        if (Array.isArray(j.noon)) setNoon(j.noon)
        if (Array.isArray(j.evening)) setEvening(j.evening)
      } catch {
        /* optional */
      }
    })()
    return () => {
      abort = true
    }
  }, [userId, date])

  async function submit(timeOfDay: TimeOfDay, moods: string[]) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/frequency/logBaseMood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, timeOfDay, moods }),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Fehler beim Speichern')
      setMsg(`Gespeichert (${timeOfDay} • Score: ${Number(j.score).toFixed?.(2) ?? j.score})`)
    } catch (e: any) {
      setMsg(e.message || 'Fehler beim Speichern')
    } finally {
      setBusy(false)
    }
  }

  async function submitAll() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const calls: Array<Promise<any>> = []
      calls.push(
        fetch('/api/frequency/logBaseMood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date, timeOfDay: 'morning', moods: morning }),
        }),
      )
      calls.push(
        fetch('/api/frequency/logBaseMood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date, timeOfDay: 'noon', moods: noon }),
        }),
      )
      calls.push(
        fetch('/api/frequency/logBaseMood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, date, timeOfDay: 'evening', moods: evening }),
        }),
      )
      const results = await Promise.all(calls)
      const jsons = await Promise.all(results.map(r => r.json().catch(() => ({}))))
      const ok = jsons.every(j => j?.ok)
      if (!ok) throw new Error(jsons.find(j => j?.error)?.error || 'Teilspeicherung fehlgeschlagen')
      const scores = jsons.map(j => j?.score).filter((x: any) => typeof x === 'number')
      setMsg(`Alle gespeichert • Scores: ${scores.map((s: number) => s.toFixed(2)).join(' / ')}`)
    } catch (e: any) {
      setMsg(e.message || 'Fehler beim Speichern')
    } finally {
      setBusy(false)
    }
  }

  const Select = ({
    value,
    onChange,
    'aria-label': ariaLabel,
  }: {
    value: string[]
    onChange: (v: string[]) => void
    'aria-label'?: string
  }) => (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {availableMoods.map(m => {
        const sel = value.includes(m)
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(sel ? value.filter(x => x !== m) : [...value, m])}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-offset-1',
              sel
                ? 'border-black bg-black text-white focus:ring-black'
                : 'border-gray-300 bg-white text-black hover:bg-gray-50 focus:ring-gray-400',
            ].join(' ')}
            aria-pressed={sel}
            aria-label={m}
          >
            {m}
          </button>
        )
      })}
    </div>
  )

  return (
    <section className="rounded-xl border p-4 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Base-Mood Check-ins (3× täglich)</h3>
        <div className="text-xs text-gray-500">Datum: {date}</div>
      </div>

      <div>
        <div className="text-xs text-gray-700 mb-2 font-medium">Morgens</div>
        <Select value={morning} onChange={setMorning} aria-label="Morgendlicher Base Mood" />
        <div className="mt-2">
          <button
            disabled={busy}
            onClick={() => submit('morning', morning)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-700 mb-2 font-medium">Mittags</div>
        <Select value={noon} onChange={setNoon} aria-label="Mittäglicher Base Mood" />
        <div className="mt-2">
          <button
            disabled={busy}
            onClick={() => submit('noon', noon)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-700 mb-2 font-medium">Abends</div>
        <Select value={evening} onChange={setEvening} aria-label="Abendlicher Base Mood" />
        <div className="mt-2">
          <button
            disabled={busy}
            onClick={() => submit('evening', evening)}
            className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Speichern
          </button>
        </div>
      </div>

      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={submitAll}
          disabled={busy}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
          title="Alle drei Check-ins speichern"
        >
          Alle speichern
        </button>
        {msg && <div className="text-xs text-gray-700">{msg}</div>}
      </div>
    </section>
  )
}
