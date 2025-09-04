'use client'
import React, { useEffect, useMemo, useState } from 'react'

interface Reflection {
  _id: string
  date: string // YYYY-MM-DD
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  title?: string
  reflection: string
  influence?: string
  createdAt: string
}

interface ReflectionHistoryProps {
  userId: string
  initialDateFrom?: string
  initialDateTo?: string
}

const PAGE_SIZE = 20

export default function ReflectionHistory({ userId, initialDateFrom, initialDateTo }: ReflectionHistoryProps){
  const today = useMemo(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,10), [])
  const [dateFrom, setDateFrom] = useState(initialDateFrom || today)
  const [dateTo, setDateTo] = useState(initialDateTo || today)
  const [timeOfDay, setTimeOfDay] = useState<Reflection['timeOfDay'] | 'all'>('all')
  const [items, setItems] = useState<Reflection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const qs = useMemo(() => {
    const p = new URLSearchParams({ userId, dateFrom, dateTo, limit: String(PAGE_SIZE), page: String(page) })
    if (timeOfDay !== 'all') p.set('timeOfDay', timeOfDay)
    return p.toString()
  }, [userId, dateFrom, dateTo, timeOfDay, page])

  async function load(reset=false){
    if (!userId) return
    setLoading(true); setError(null)
    try{
      const res = await fetch(`/api/frequency/getReflection?${qs}`)
      const ct = res.headers.get('content-type') || ''
      if (!res.ok){
        const text = await res.text(); throw new Error(`HTTP ${res.status} – ${text.slice(0,140)}`)
      }
      if (!ct.includes('application/json')){
        const text = await res.text(); throw new Error(`Expected JSON, got ${ct}. Body: ${text.slice(0,140)}`)
      }
      const data = await res.json()
      const list: Reflection[] = Array.isArray(data.reflections) ? data.reflections : []
      setItems(prev => reset ? list : [...prev, ...list])
      setHasMore(list.length === PAGE_SIZE)
    }catch(e:any){ setError(e.message || 'Unbekannter Fehler'); setItems(prev => reset ? [] : prev) }
    finally{ setLoading(false) }
  }

  // initial + when filters change
  useEffect(() => { setPage(0); load(true) // reset
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateFrom, dateTo, timeOfDay])

  // paginated loads
  useEffect(() => { if (page>0) load(false) // append
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function fmtDate(iso:string){ try{ return new Intl.DateTimeFormat('de-DE',{ weekday:'short', day:'2-digit', month:'2-digit'}).format(new Date(iso)) }catch{ return iso } }

  return (
    <section className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border min-w-0">
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-xs text-gray-600">von</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-600">bis</label>
          <input type="date" className="border rounded px-2 py-1 text-sm" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-700">Tageszeit:</span>
          {(['all','morning','afternoon','evening'] as const).map(k => (
            <button key={k} type="button" onClick={()=>setTimeOfDay(k as any)}
              className={`px-2 py-1 rounded border text-xs ${timeOfDay===k?'bg-black text-white border-black':'bg-white text-gray-900 border-gray-200'}`}>{k==='all'?'alle':k}</button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {loading && !items.length ? (
          <p className="text-sm text-gray-600">Lade…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !items.length ? (
          <p className="text-sm text-gray-600">Keine Reflexionen gefunden.</p>
        ) : (
          <ul className="space-y-3 sm:space-y-4 max-h-[56vh] overflow-y-auto pr-1">
            {items.map(entry => (
              <li key={entry._id} className="border p-3 sm:p-4 rounded-lg bg-gray-50">
                <p className="text-xs sm:text-sm text-gray-500 mb-1 flex items-center gap-2">
                  <span>{fmtDate(entry.date)}</span>
                  <span>•</span>
                  <span>{entry.timeOfDay==='morning'?'🕊️ Morgen': entry.timeOfDay==='afternoon'?'🌤️ Nachmittag':'🌙 Abend'}</span>
                </p>
                {entry.title ? (
                  <p className="text-sm sm:text-base font-semibold mb-1 break-words text-gray-900">{entry.title}</p>
                ) : null}
                <p className="text-sm sm:text-base mb-1 break-words text-gray-900">{entry.reflection}</p>
                {entry.influence ? (
                  <p className="text-xs sm:text-sm text-gray-600 italic break-words">Einfluss: {entry.influence}</p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                    onClick={()=> navigator.clipboard?.writeText(`${entry.title? entry.title+" — ":""}${entry.reflection}`)}
                  >Kopieren</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasMore && (
        <div className="mt-3">
          <button disabled={loading} onClick={()=> setPage(p=>p+1)} className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">Mehr laden</button>
        </div>
      )}
    </section>
  )
}