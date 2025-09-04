'use client'

import * as React from 'react'
import { HelpCircle, TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type MagnifyMaintainMode = 'maintain' | 'magnify'

type Smoothed = {
  convictionSmoothed?: number | null
  frequencySmoothed?: number | null
  mmState?: { mode: MagnifyMaintainMode; streakPos:number; streakNeg:number } | null
  lastUpdateDate?: string | null
} | null

type Preview = { convictionToday?: number | null; frequencyToday?: number | null } | null

type Trend = { d7?: number | null; d14?: number | null } | null

function TrendBadge({ value, unit, label }: { value?: number | null; unit: ' / 10' | '%' | ''; label: string }){
  if (typeof value !== 'number') return <span className="text-[10px] text-gray-400">{label}: —</span>
  const sign = Math.sign(value)
  const Icon = sign > 0 ? TrendingUp : sign < 0 ? TrendingDown : Minus
  const tone = sign > 0 ? 'text-emerald-600' : sign < 0 ? 'text-rose-600' : 'text-gray-600'
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${tone}`}>
      <Icon className="h-3 w-3" /> {label}: {Math.abs(value).toFixed(1)}{unit}
    </span>
  )
}

export default function ConvictionCard({
  userId,
  baseConviction,
  smoothed,
  preview,
  trend,
}: {
  userId: string
  baseConviction?: number | null
  smoothed?: Smoothed
  preview?: Preview
  trend?: { conviction?: Trend } | null
}){
  const baseline = typeof baseConviction==='number' ? Math.max(0, Math.min(10, baseConviction)) : null
  const smooth = typeof smoothed?.convictionSmoothed === 'number' ? Math.max(0, Math.min(10, smoothed!.convictionSmoothed!)) : null
  const today = typeof preview?.convictionToday === 'number' ? Math.max(0, Math.min(10, preview!.convictionToday!)) : null
  const main = smooth ?? baseline

  return (
    <div className="col-span-1 md:col-span-1 xl:col-span-6 min-w-0">
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Conviction</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-gray-500 hover:text-gray-800" aria-label="Info">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p><b>Was ist das?</b> Conviction ist deine Grundsicherheit. Änderungen werden per EWMA <i>langsam</i> geglättet.</p>
                  <p className="mt-1"><b>Maintain/Magnify:</b> Nach Streaks wird der Schritt minimal größer (Magnify); sonst halten wir ihn klein (Maintain).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            {smoothed?.lastUpdateDate && (
              <span className="text-[10px] text-gray-500 inline-flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {smoothed.lastUpdateDate}
              </span>
            )}
            {smoothed?.mmState && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${smoothed.mmState.mode==='magnify' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {smoothed.mmState.mode==='magnify' ? 'Magnify' : 'Maintain'} · {smoothed.mmState.streakPos||0}↑/{smoothed.mmState.streakNeg||0}↓
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 text-3xl font-semibold">
          {main!=null ? main.toFixed(1) : '—'} <span className="text-base text-gray-600">/ 10</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          {baseline!=null && <span className="px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700">Baseline: <b>{baseline.toFixed(1)}</b></span>}
          {smooth!=null && <span className="px-2 py-0.5 rounded-full border bg-black text-white">Smoothed: <b>{smooth.toFixed(1)}</b></span>}
          {today!=null && <span className="px-2 py-0.5 rounded-full border bg-gray-100 text-gray-700">Heute: <b>{today.toFixed(1)}</b></span>}
        </div>

        <div className="mt-2 flex items-center gap-3">
          <TrendBadge value={trend?.conviction?.d7 ?? null} unit=" / 10" label="Δ7" />
          <TrendBadge value={trend?.conviction?.d14 ?? null} unit=" / 10" label="Δ14" />
        </div>

        <div className="mt-3 h-3 w-full rounded bg-gray-100 overflow-hidden" aria-label="Conviction">
          <div className="h-3 bg-black" style={{ width: `${(Number(main||0)/10)*100}%` }} />
        </div>

        <p className="mt-3 text-xs text-gray-600">
          Die Zahl basiert auf Baseline + täglichen Micro-Beweisen. Einzeltage wirken minimal; konsistente Streaks werden sanft verstärkt.
        </p>
      </div>
    </div>
  )
}
