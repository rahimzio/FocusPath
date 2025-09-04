'use client'
import * as React from 'react'

export function AddCustomMood({ userId, onAdded }:{ userId:string; onAdded?:(p:{label:string; preference:'gern'|'egal'|'nicht'})=>void }){
  const [label, setLabel] = React.useState('')
  const [preference, setPreference] = React.useState<'gern'|'egal'|'nicht'>('egal')
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  async function save(){
    const name = label.trim()
    if (!name) return
    setBusy(true); setMsg(null)
    try{
      const r = await fetch('/api/frequency/setMoodPreference', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ userId, label: name, preference }) })
      const j = await r.json(); if (!j.ok) throw new Error(j.error || 'Fehler beim Speichern')
      onAdded?.({ label: name, preference })
      setLabel(''); setPreference('egal'); setMsg('Gespeichert!')
    }catch(e:any){ setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="rounded-xl border p-4 space-y-3">
      <h4 className="font-medium">Eigenen Base‑Mood hinzufügen</h4>
      <div className="flex gap-2">
        <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="z. B. geerdet" className="flex-1 border rounded px-2 py-2" />
        <select value={preference} onChange={e=>setPreference(e.target.value as any)} className="border rounded px-2 py-2">
          <option value="gern">gern</option>
          <option value="egal">egal</option>
          <option value="nicht">nicht gern</option>
        </select>
        <button disabled={busy} onClick={save} className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">Speichern</button>
      </div>
      {msg && <div className="text-xs text-gray-600">{msg}</div>}
    </section>
  )
}
