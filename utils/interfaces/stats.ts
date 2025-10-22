// Generische Stat- & Trend-Typen (module-agnostisch)

export type Smoothed = {
  frequencySmoothed?: number | null;
  convictionSmoothed?: number | null;
  lastUpdateDate?: string | null;
  mmState?: { mode: 'maintain' | 'magnify'; streakPos: number; streakNeg: number } | null;
} | null;

export type Preview = {
  frequencyToday?: number | null;
  convictionToday?: number | null;
} | null;

export type TrendPair = { d7?: number | null; d14?: number | null } | null;

export type Trend = {
  freq?: TrendPair;
  conviction?: TrendPair;
} | null;
