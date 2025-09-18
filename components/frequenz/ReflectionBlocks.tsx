'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { pickDailyQuestions } from '@/pages/api/frequency/selectQuestions';
import { BlockQuestion, questionsByBlock } from '@/pages/api/frequency/questionBankBlocks';
import { computeBlockScore } from '@/pages/api/frequency/scooring';


export type ReflectionBlock = 'morning' | 'afternoon' | 'evening';

interface Props {
  userId: string;
  date: string; // YYYY-MM-DD
  /** Startet eingeklappt (nur mobile relevant) */
  initialCollapsed?: boolean;
  /** Startgröße der Komponente */
  variant?: 'default' | 'compact';
}

type AnswersState = Record<ReflectionBlock, Record<string, number>>;
type NotesState   = Record<ReflectionBlock, string>;
type SavedState   = Partial<Record<ReflectionBlock, boolean>>;

const labels: Record<ReflectionBlock, string> = {
  morning: 'Morgen',
  afternoon: 'Nachmittag',
  evening: 'Abend',
};

export default function ReflectionBlocks({
  userId,
  date,
  initialCollapsed = true,
  variant: initialVariant = 'default',
}: Props) {
  const [answers, setAnswers] = useState<AnswersState>({
    morning: {}, afternoon: {}, evening: {}
  });
  const [notes, setNotes] = useState<NotesState>({ morning: '', afternoon: '', evening: '' });
  const [saving, setSaving] = useState<SavedState>({});
  const [loading, setLoading] = useState(false);

  // UI state: collapsed on mobile + size variant (persist via localStorage)
  const [collapsedMobile, setCollapsedMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return initialCollapsed;
    const v = window.localStorage.getItem('fp_reflection_collapsedMobile');
    return v === null ? initialCollapsed : v === '1';
  });
  const [variant, setVariant] = useState<'default'|'compact'>(() => {
    if (typeof window === 'undefined') return initialVariant;
    const v = window.localStorage.getItem('fp_reflection_variant') as 'default'|'compact'|null;
    return v ?? initialVariant;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fp_reflection_collapsedMobile', collapsedMobile ? '1' : '0');
    }
  }, [collapsedMobile]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('fp_reflection_variant', variant);
    }
  }, [variant]);

  // deterministische Auswahl: 5 Fragen je Block
  const dailyQs: Record<ReflectionBlock, BlockQuestion[]> = useMemo(() => ({
    morning:   pickDailyQuestions(questionsByBlock.morning, date, userId, 5),
    afternoon: pickDailyQuestions(questionsByBlock.afternoon, date, userId, 5),
    evening:   pickDailyQuestions(questionsByBlock.evening, date, userId, 5),
  }), [date, userId]);

  // Prefill bestehender Antworten
  useEffect(() => {
    let abort = false;
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ userId, date }).toString();
        const res = await fetch(`/api/frequency/getReflection?${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const nextAnswers: AnswersState = { morning: {}, afternoon: {}, evening: {} };
        const nextNotes: NotesState     = { morning: '', afternoon: '', evening: '' };

        for (const r of (data.reflections || [])) {
          const b = r.block as ReflectionBlock;
          if (!b) continue;
          nextAnswers[b] = r.answers || {};
          nextNotes[b]   = r.note || '';
        }
        if (!abort) { setAnswers(nextAnswers); setNotes(nextNotes); }
      } catch {
        // silent
      } finally { setLoading(false); }
    }
    load(); return () => { abort = true; };
  }, [userId, date]);

  function setAnswer(block: ReflectionBlock, qid: string, value: number) {
    setAnswers(prev => ({ ...prev, [block]: { ...prev[block], [qid]: value } }));
  }

  async function saveBlock(block: ReflectionBlock) {
    setSaving(prev => ({ ...prev, [block]: true }));
    try {
      const payload = { userId, date, block, answers: answers[block], note: notes[block] || '' };
      const res = await fetch('/api/frequency/upsertReflection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await res.json().catch(()=>({ ok: res.ok }));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || `HTTP ${res.status}`);
      toast.success('Frequenz gespeichert');
    } catch (e:any) {
      toast.error(e.message || 'Konnte nicht speichern');
    } finally {
      setSaving(prev => ({ ...prev, [block]: false }));
    }
  }

  function renderLikert(block: ReflectionBlock, q: BlockQuestion) {
    const v = answers[block][q.id] ?? 0;
    const opts = [0,1,2,3,4];
    const radioSize = variant === 'compact' ? 'w-3 h-3' : 'w-4 h-4';
    const labelText = variant === 'compact' ? 'text-[11px]' : 'text-xs';

    return (
      <div key={q.id} className={`py-2 ${variant === 'compact' ? 'gap-1' : 'gap-2'} border-b last:border-b-0`}>
        <div className={`${variant === 'compact' ? 'text-[12px]' : 'text-sm'} mb-2`}>{q.label}</div>
        <div className="flex items-center gap-3">
          {opts.map(n => (
            <label key={n} className={`flex items-center gap-1 cursor-pointer ${labelText}`}>
              <input
                type="radio"
                className={radioSize}
                name={`${block}-${q.id}`}
                checked={v === n}
                onChange={() => setAnswer(block, q.id, n)}
              />
              {n}
            </label>
          ))}
        </div>
      </div>
    );
  }

  function renderBlock(block: ReflectionBlock) {
    const qs = dailyQs[block];
    const { blockScore } = computeBlockScore(answers[block], qs);

    return (
      <TabsContent key={block} value={block} className={`mt-4 space-y-4 ${variant === 'compact' ? 'mt-3' : 'mt-4'}`}>
        <div className={`rounded border ${variant === 'compact' ? 'p-2' : 'p-3'}`}>
          {qs.map(q => renderLikert(block, q))}
        </div>

        <div className={`${variant === 'compact' ? 'text-[11px]' : 'text-xs'} text-gray-600`}>
          Block-Frequenz: <b>{blockScore}</b>
        </div>

        <div className="space-y-2">
          <Textarea
            rows={variant === 'compact' ? 2 : 3}
            placeholder="Optional: kurze Notiz (ohne Einfluss auf Score)"
            value={notes[block]}
            onChange={e => setNotes(prev => ({ ...prev, [block]: e.target.value }))}
            className={variant === 'compact' ? 'text-[13px]' : ''}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size={variant === 'compact' ? 'sm' : 'default'}
              onClick={() => { setAnswers(a => ({ ...a, [block]: {} })); setNotes(n => ({ ...n, [block]: '' })); }}
            >
              Leeren
            </Button>
            <Button
              size={variant === 'compact' ? 'sm' : 'default'}
              onClick={() => saveBlock(block)}
              disabled={!!saving[block]}
            >
              {saving[block] ? 'Speichern…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </TabsContent>
    );
  }

  // Klassen je Variant
  const cardPad = variant === 'compact' ? 'p-3' : '';
  const headerMb = variant === 'compact' ? 'pb-1' : 'pb-2';
  const titleClass = variant === 'compact' ? 'text-sm' : '';

  return (
    <div className="mb-6">
      {/* Mobile Toggle (nur auf kleinen Screens sichtbar) */}
      <button
        onClick={() => setCollapsedMobile(!collapsedMobile)}
        className="block sm:hidden w-full py-2 rounded-lg bg-blue-500 text-white mb-3"
      >
        {collapsedMobile ? 'Reflexion anzeigen' : 'Reflexion ausblenden'}
      </button>

      {/* Desktop: Variant-Switch + auf Mobile in geöffneter Ansicht */}
      {!collapsedMobile && (
        <div className="flex justify-end gap-2 mb-2 sm:mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVariant(v => (v === 'compact' ? 'default' : 'compact'))}
            className="hidden sm:inline-flex"
            title="Größe umschalten"
          >
            {variant === 'compact' ? 'Größe: Kompakt ✓' : 'Größe: Standard'}
          </Button>
          {/* Auch auf Mobile anzeigen, wenn geöffnet */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVariant(v => (v === 'compact' ? 'default' : 'compact'))}
            className="sm:hidden inline-flex"
            title="Größe umschalten"
          >
            {variant === 'compact' ? 'Kompakt ✓' : 'Standard'}
          </Button>
        </div>
      )}

      {/* Card (versteckt, wenn mobile-collapsed) */}
      <div className={`${collapsedMobile ? 'hidden sm:block' : ''}`}>
        <Card className={`border ${cardPad}`}>
          <CardHeader className={headerMb}>
            <CardTitle className={titleClass}>💭 Reflexion (Multiple Choice)</CardTitle>
          </CardHeader>
          <CardContent className={variant === 'compact' ? 'pt-0' : ''}>
            <Tabs defaultValue="morning">
              <TabsList className={`grid w-full grid-cols-3 ${variant === 'compact' ? 'h-8 text-[12px]' : ''}`}>
                {(['morning','afternoon','evening'] as ReflectionBlock[]).map(b =>
                  <TabsTrigger key={b} value={b}>{labels[b]}</TabsTrigger>
                )}
              </TabsList>
              {(['morning','afternoon','evening'] as ReflectionBlock[]).map(renderBlock)}
            </Tabs>
          </CardContent>
          {loading && <div className="p-3 text-xs text-gray-500">Lade bestehende Antworten…</div>}
        </Card>
      </div>
    </div>
  );
}
