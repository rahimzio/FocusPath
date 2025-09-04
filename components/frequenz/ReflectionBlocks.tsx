'use client'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type ReflectionBlock = 'morning' | 'afternoon' | 'evening'

interface Props {
  userId: string
  date: string // YYYY-MM-DD
}

type BlockState = { title: string; content: string }

export default function ReflectionBlocks({ userId, date }: Props) {
  const empty: Record<ReflectionBlock, BlockState> = {
    morning: { title: '', content: '' },
    afternoon: { title: '', content: '' },
    evening: { title: '', content: '' },
  }
  const [state, setState] = useState(empty)
  const [saving, setSaving] = useState<Partial<Record<ReflectionBlock, boolean>>>({})
  const [loading, setLoading] = useState(false)

  // Prefill existing reflections for that date
  useEffect(() => {
    let abort = false
    async function load(){
      setLoading(true)
      try{
        const qs = new URLSearchParams({ userId, date }).toString()
        const res = await fetch(`/api/frequency/getReflection?${qs}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = ct.includes('application/json') ? await res.json() : { reflections: [] }
        const byBlock: Record<ReflectionBlock, BlockState> = { ...empty }
        for (const r of (data.reflections || [])){
          const b = (r.timeOfDay || r.block) as ReflectionBlock
          if (!b || !byBlock[b]) continue
          byBlock[b] = { title: r.title || '', content: r.reflection || r.content || '' }
        }
        if (!abort) setState(byBlock)
      }catch(e){ /*noop*/ } finally{ setLoading(false) }
    }
    load(); return ()=>{ abort = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, date])

  function handleChange(block: ReflectionBlock, field: keyof BlockState, value: string){
    setState(prev => ({ ...prev, [block]: { ...prev[block], [field]: value } }))
  }

  async function saveBlock(block: ReflectionBlock){
    const payload = { userId, date, block, title: state[block].title.trim(), content: state[block].content.trim() }
    if (!payload.title && !payload.content){ toast.info('Bitte etwas eingeben'); return }
    setSaving(prev => ({ ...prev, [block]: true }))
    try{
      const res = await fetch('/api/frequency/upsertReflection', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json().catch(()=>({ ok: res.ok }))
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`)
      toast.success('Notiz gespeichert')
    }catch(e:any){ toast.error(e.message || 'Konnte Notiz nicht speichern') }
    finally{ setSaving(prev => ({ ...prev, [block]: false })) }
  }

  const blocks: ReflectionBlock[] = ['morning','afternoon','evening']
  const labels: Record<ReflectionBlock, string> = { morning: 'Morgen', afternoon: 'Nachmittag', evening: 'Abend' }

  return (
    <Card className="mb-6 border">
      <CardHeader className="pb-2">
        <CardTitle>💭 Reflexion</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="morning">
          <TabsList className="grid w-full grid-cols-3">
            {blocks.map(b => <TabsTrigger key={b} value={b}>{labels[b]}</TabsTrigger>)}
          </TabsList>
          {blocks.map(block => (
            <TabsContent key={block} value={block} className="mt-4 space-y-3">
              <Input
                placeholder="Titel (optional)"
                value={state[block].title}
                onChange={e => handleChange(block, 'title', e.target.value)}
              />
              <div>
                <Textarea
                  rows={4}
                  placeholder="Deine Reflexion"
                  value={state[block].content}
                  onChange={e => handleChange(block, 'content', e.target.value)}
                />
                <div className="text-[10px] text-gray-500 mt-1">{state[block].content.length} Zeichen</div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={() => { handleChange(block, 'title', ''); handleChange(block, 'content', '') }}>Leeren</Button>
                <Button onClick={() => saveBlock(block)} disabled={!!saving[block]}>
                  {saving[block] ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
      {loading && <div className="p-3 text-xs text-gray-500">Lade bestehende Notizen…</div>}
    </Card>
  )
}
