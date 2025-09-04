'use client';

import * as React from 'react';
import { HelpCircle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type MagnifyMaintainMode = 'maintain' | 'magnify';

type Smoothed = {
  frequencySmoothed?: number | null;
  convictionSmoothed?: number | null;
  lastUpdateDate?: string | null;
  mmState?: { mode: MagnifyMaintainMode; streakPos: number; streakNeg: number } | null;
} | null;

type Preview = {
  frequencyToday?: number | null;
  convictionToday?: number | null;
} | null;

type TrendPair = { d7?: number | null; d14?: number | null } | null;
type Trend = {
  freq?: TrendPair;
  conviction?: TrendPair;
} | null;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function freqTone(pct: number | null | undefined) {
  const v = typeof pct === 'number' ? pct : -1;
  if (v < 0) return 'bg-gray-200';
  if (v <= 39) return 'bg-red-400';
  if (v <= 69) return 'bg-yellow-400';
  if (v <= 89) return 'bg-green-400';
  return 'bg-yellow-100 border border-yellow-200';
}

function DeltaBadge({ value, unit, label }: { value?: number | null; unit: '%' | ' / 10' | ''; label: string }) {
  if (typeof value !== 'number') {
    return <span className="inline-flex items-center gap-1 text-[10px] text-gray-400"><Minus className="h-3 w-3" /> {label}: —</span>;
  }
  const s = Math.sign(value);
  const Icon = s > 0 ? TrendingUp : s < 0 ? TrendingDown : Minus;
  const tone = s > 0 ? 'text-emerald-600' : s < 0 ? 'text-rose-600' : 'text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${tone}`}>
      <Icon className="h-3 w-3" /> {label}: {Math.abs(value).toFixed(1)}{unit}
    </span>
  );
}

export default function TrustTankBar({
  baseConviction,
  metrics, // bleibt für Abwärtskompatibilität – wird hier nicht mehr benötigt
  smoothed,
  preview,
  trend,
}: {
  baseConviction?: number | null;
  metrics?: any;
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
    <div className="rounded-xl border bg-white p-4">
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
                <p><b>Glättung:</b> Wir nutzen eine EWMA (Exponentially Weighted Moving Average), damit tägliche Schwankungen nur <i>minimal</i> wirken.</p>
                <p className="mt-1"><b>Maintain/Magnify:</b> Bei stabil positiven Streaks wird der Glättungsfaktor leicht erhöht (Magnify), sonst bleibt er klein (Maintain).</p>
                <p className="mt-1">Die Balken zeigen den geglätteten Zustand (schwarz/gefärbt) – der kleine Marker zeigt die heutige Vorschau.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2">
          {smoothed?.lastUpdateDate && (
            <span className="text-[10px] text-gray-500">zuletzt: {smoothed.lastUpdateDate}</span>
          )}
          {mm && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                mm.mode === 'magnify'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {mm.mode === 'magnify' ? 'Magnify' : 'Maintain'} · {mm.streakPos || 0}↑/{mm.streakNeg || 0}↓
            </span>
          )}
        </div>
      </div>

      {/* Frequency */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-700">Frequency</div>
          <div className="text-xs text-gray-600">
            {typeof freqSmoothed === 'number' ? `${Math.round(freqSmoothed)}%` : '—'}
          </div>
        </div>
        <div className="mt-1 h-3 w-full rounded bg-gray-100 relative overflow-visible">
          {/* smoothed fill */}
          <div
            className={`h-3 rounded ${freqTone(freqSmoothed)} ${freqSmoothed!=null && freqSmoothed>=90 ? 'shadow-[0_0_0_1px_rgba(234,179,8,0.6)]' : ''}`}
            style={{ width: `${typeof freqSmoothed === 'number' ? freqSmoothed : 0}%` }}
          />
          {/* today marker */}
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
        {/* Trend badges */}
        {trend?.freq && (
          <div className="mt-1 flex items-center gap-3">
            <DeltaBadge value={trend.freq.d7 ?? null} unit="%" label="Δ7" />
            <DeltaBadge value={trend.freq.d14 ?? null} unit="%" label="Δ14" />
          </div>
        )}
      </div>

      {/* Conviction */}
      <div className="mt-4">
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
        <div className="mt-1 h-3 w-full rounded bg-gray-100 relative overflow-visible">
          {/* baseline hint (thin) */}
          {typeof convBaseline === 'number' && (
            <div
              className="absolute inset-y-0 w-px bg-gray-300"
              style={{ left: `${(convBaseline / 10) * 100}%` }}
              aria-hidden
            />
          )}
          {/* smoothed fill */}
          <div
            className="h-3 rounded bg-black"
            style={{ width: `${typeof convSmoothed === 'number' ? (convSmoothed / 10) * 100 : typeof convBaseline === 'number' ? (convBaseline / 10) * 100 : 0}%` }}
          />
          {/* today marker */}
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
        {/* Trend badges */}
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
    </div>
  );
}
