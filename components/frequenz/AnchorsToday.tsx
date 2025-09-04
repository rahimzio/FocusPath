'use client'
import * as React from 'react'

export function AnchorsToday({ userId, frequencyAnchors = [], concentrationAnchors = [] }:{ userId:string; frequencyAnchors:{label:string}[]; concentrationAnchors:{label:string}[] }){
  const [busy, setBusy] = React.useState<string | null>(null)
  const [done, setDone] = React.useState<Record<string, boolean>>({})

  async function check(kind:'frequency'|'concentration', label:string){
    const key = `${kind}:${label}`
    setBusy(key)
    try{
      const r = await fetch('/api/frequency/checkinAnchor', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, kind, label, done: true })})
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Fehler beim Speichern')
      setDone(prev => ({ ...prev, [key]: true }))
    } catch(e){ console.error(e) } finally { setBusy(null) }
  }

  const Pill = ({kind,label}:{kind:'frequency'|'concentration';label:string}) => (
    <button disabled={!!busy} onClick={()=>check(kind,label)}
      className={[ 'px-2 py-1 rounded-full text-xs border', done[`${kind}:${label}`] ? 'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-white border-gray-200 hover:bg-gray-50' ].join(' ')}>
      {done[`${kind}:${label}`] ? '✔︎ ' : ''}{label}
    </button>
  )

  return (
    <section className="rounded-xl border p-4 space-y-3">
      <h4 className="font-medium">Frequency‑Anchors – Heute erledigt?</h4>
      <div className="flex flex-wrap gap-2">
        {frequencyAnchors.length ? frequencyAnchors.map((a:any)=> <Pill key={`f:${a.label}`} kind="frequency" label={a.label} />) : <span className="text-xs text-gray-500">Keine hinterlegt.</span>}
      </div>
      <h4 className="font-medium mt-4">Concentration‑Anchors – Heute erledigt?</h4>
      <div className="flex flex-wrap gap-2">
        {concentrationAnchors.length ? concentrationAnchors.map((a:any)=> <Pill key={`c:${a.label}`} kind="concentration" label={a.label} />) : <span className="text-xs text-gray-500">Keine hinterlegt.</span>}
      </div>
    </section>
  )
}