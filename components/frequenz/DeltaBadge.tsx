'use client'
import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function DeltaBadge({
  value, unit, label, className = '',
}: { value?: number | null; unit?: string; label: string; className?: string }) {
  if (typeof value !== 'number') {
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] text-gray-400 ${className}`}>
        <Minus className="h-3 w-3" /> {label}: —
      </span>
    );
  }
  const s = Math.sign(value);
  const Icon = s > 0 ? TrendingUp : s < 0 ? TrendingDown : Minus;
  const tone = s > 0 ? 'text-emerald-600' : s < 0 ? 'text-rose-600' : 'text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] ${tone} ${className}`}>
      <Icon className="h-3 w-3" /> {label}: {Math.abs(value).toFixed(1)}{unit ?? ''}
    </span>
  );
}
