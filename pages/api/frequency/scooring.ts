// utils/frequenz/scoring.ts
import type { BlockQuestion } from "./questionBankBlocks";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

const toScore = (v: number, inverted?: boolean) => {
  const x = Math.max(0, Math.min(4, v ?? 0)); // 0..4
  const base = inverted ? 4 - x : x;
  return (base / 4) * 100; // 0..100
};

export function computeBlockScore(
  answers: Record<string, number>,
  questions: BlockQuestion[]
): { blockScore: number; domains: Record<string, number> } {
  if (!questions.length) return { blockScore: 0, domains: {} };

  let sum = 0, wsum = 0;
  const domAcc: Record<string, { s: number; w: number }> = {};

  for (const q of questions) {
    const w = q.weight ?? 1;
    const s = toScore(answers[q.id], q.inverted);
    sum += s * w; wsum += w;

    if (!domAcc[q.domain]) domAcc[q.domain] = { s: 0, w: 0 };
    domAcc[q.domain].s += s * w;
    domAcc[q.domain].w += w;
  }

  const blockScore = Math.round(sum / Math.max(1, wsum));
  const domains: Record<string, number> = {};
  for (const [dom, v] of Object.entries(domAcc)) {
    domains[dom] = Math.round(v.s / Math.max(1, v.w));
  }
  return { blockScore: clamp(blockScore), domains };
}

export function computeDailyFrequency(parts: Partial<Record<"morning"|"afternoon"|"evening", number>>) {
  const weights: Record<string, number> = { morning: 0.4, afternoon: 0.2, evening: 0.4 };
  let num = 0, den = 0;
  for (const k of Object.keys(parts) as Array<"morning"|"afternoon"|"evening">) {
    const v = parts[k];
    if (typeof v === "number") { num += v * weights[k]; den += weights[k]; }
  }
  if (den === 0) return 0;
  return Math.round(num / den);
}
