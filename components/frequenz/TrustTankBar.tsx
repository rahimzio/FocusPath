'use client';

import * as React from 'react';
import { HelpCircle, CalendarDays } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeltaBadge } from './DeltaBadge';
import { clamp, pctTone } from '@/utils/interfaces/shared';
import { Preview, Smoothed, Trend } from '@/utils/interfaces/stats';

export default function TrustTankBar({
  baseConviction,
  smoothed,
  preview,
  trend,
}: {
  baseConviction?: number | null;
  smoothed?: Smoothed;
  preview?: Preview;
  trend?: Trend | null;
}) {
  const freqSmoothed = typeof smoothed?.frequencySmoothed === 'number' ? clamp(smoothed!.frequencySmoothed!, 0, 100) : null;
  const convSmoothed = typeof smoothed?.convictionSmoothed === 'number' ? clamp(smoothed!.convictionSmoothed!, 0, 10) : null;
  const freqToday = typeof preview?.frequencyToday === 'number' ? clamp(preview!.frequencyToday!, 0, 100) : null;
  const convToday = typeof preview?.convictionToday === 'number' ? clamp(preview!.convictionToday!, 0, 10) : null;
  const convBaseline = typeof baseConviction === 'number' ? clamp(baseConviction!, 0, 10) : null;
  const mm = smoothed?.mmState || null;

  return (
    <section className="rounded-xl border bg-white p-4" aria-label="Trust Tank">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Trust Tank</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-gray-500 hover:text-gray-800" aria-label="Info">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                <p><b>Glättung:</b> EWMA – tägliche Schwankungen wirken nur <i>minimal</i>.</p>
                <p className="mt-1"><b>Maintain/Magnify:</b> Positive Streaks → etwas stärkeres Update (Magnify), sonst Maintain.</p>
                <p className="mt-1">Balken = geglättet · Dreieck = heutige Vorschau.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2">
          {smoothed?.lastUpdateDate && (
            <span className="text-[10px] text-gray-500 inline-flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {smoothed.lastUpdateDate}
            </span>
          )}
          {mm && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                mm.mode === 'magnify'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
              aria-label={`Modus: ${mm.mode}; Streaks: ${mm.streakPos || 0} hoch / ${mm.streakNeg || 0} runter`}
            >
              {mm.mode === 'magnify' ? 'Magnify' : 'Maintain'} · {mm.streakPos || 0}↑/{mm.streakNeg || 0}↓
            </span>
          )}
        </div>
      </div>

      {/* Frequency */}
      <div className="mt-3" aria-label="Frequency">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-700">Frequency</div>
          <div className="text-xs text-gray-600">{typeof freqSmoothed === 'number' ? `${Math.round(freqSmoothed)}%` : '—'}</div>
        </div>
        <div className="mt-1 h-3 w-full rounded bg-gray-100 relative overflow-visible" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={freqSmoothed ?? undefined}>
          <div
            className={`h-3 rounded ${pctTone(freqSmoothed)} ${freqSmoothed!=null && freqSmoothed>=90 ? 'shadow-[0_0_0_1px_rgba(234,179,8,0.6)]' : ''}`}
            style={{ width: `${typeof freqSmoothed === 'number' ? freqSmoothed : 0}%` }}
          />
          {typeof freqToday === 'number' && (
            <div
              className="absolute -top-1 -translate-x-1/2"
              style={{ left: `${freqToday}%` }}
              aria-label={`Heute: ${Math.round(freqToday)}%`}
            >
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-600" />
            </div>
          )}
        </div>
        {trend?.freq && (
          <div className="mt-1 flex items-center gap-3">
            <DeltaBadge value={trend.freq.d7 ?? null} unit="%" label="Δ7" />
            <DeltaBadge value={trend.freq.d14 ?? null} unit="%" label="Δ14" />
          </div>
        )}
      </div>

      {/* Conviction */}
      <div className="mt-4" aria-label="Conviction">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-700">Conviction</div>
          <div className="text-xs text-gray-600">
            {typeof convSmoothed === 'number'
              ? `${convSmoothed.toFixed(1)} / 10`
              : typeof convBaseline === 'number'
              ? `${convBaseline.toFixed(1)} / 10`
              : '—'}
          </div>
        </div>
        <div className="mt-1 h-3 w-full rounded bg-gray-100 relative overflow-visible" role="meter" aria-valuemin={0} aria-valuemax={10} aria-valuenow={convSmoothed ?? convBaseline ?? undefined}>
          {typeof convBaseline === 'number' && (
            <div
              className="absolute inset-y-0 w-px bg-gray-300"
              style={{ left: `${(convBaseline / 10) * 100}%` }}
              aria-hidden
            />
          )}
          <div
            className="h-3 rounded bg-black"
            style={{ width: `${typeof convSmoothed === 'number' ? (convSmoothed / 10) * 100 : typeof convBaseline === 'number' ? (convBaseline / 10) * 100 : 0}%` }}
          />
          {typeof convToday === 'number' && (
            <div
              className="absolute -top-1 -translate-x-1/2"
              style={{ left: `${(convToday / 10) * 100}%` }}
              aria-label={`Heute: ${convToday.toFixed(1)} / 10`}
            >
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-600" />
            </div>
          )}
        </div>
        {trend?.conviction && (
          <div className="mt-1 flex items-center gap-3">
            <DeltaBadge value={trend.conviction.d7 ?? null} unit=" / 10" label="Δ7" />
            <DeltaBadge value={trend.conviction.d14 ?? null} unit=" / 10" label="Δ14" />
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-gray-600">
        Einzelne Tage zählen wenig. Konsistenz über Wochen bewegt die Balken (sanfte EWMA, 2Ms).
      </p>
    </section>
  );
}
