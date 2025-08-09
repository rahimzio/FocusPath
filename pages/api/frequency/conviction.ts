// pages/api/frequency/conviction.ts
// Utility module (not an API handler). Safe to import from client code.

export type DayLabel = "L Day" | "M Day" | "W Day" | "W+ Day";

export type ConvictionInputs = {
  /** ISO date (YYYY-MM-DD) this snapshot is for */
  date: string;

  /** Optional, for visibility — not required by the client card */
  userId?: string;

  /** kept vs. broken self-promises today */
  selfPromisesKept: number;    // e.g. finished planned habits/tasks
  selfPromisesBroken: number;  // missed or bailed

  /** evidence you added today that supports the new identity (notes, logs, small wins) */
  evidenceAdds: number;

  /**
   * "Anti-evidence": things you consciously **did not want to do** but did anyway
   * (impulses, doomscrolling, junk, vices, breaking guardrails, etc.).
   * This drags frequency down.
   */
  antiEvidenceAdds: number;

  /** deep focus minutes vs. distraction minutes (optional but helpful) */
  focusMinutes?: number;
  distractionMinutes?: number;

  /** your daily mood label (maps to alpha/theta-friendly state) */
  moodLabel?: DayLabel;

  /**
   * Previous EMA (yesterday). The server fills this before returning to the client.
   * If missing on first day, we gracefully seed from today's raw.
   */
  prevEma?: number;
};

export type ConvictionBreakdown = {
  raw: number;          // 0..100 (after penalties)
  ema: number;          // 0..100 smoothed
  components: {
    promiseScore: number;   // 0..1
    evidenceScore: number;  // 0..1
    focusScore: number;     // 0..1
    moodScore: number;      // 0..1
    antiPenalty: number;    // 0..100 subtracted from raw
  };
};

/** map daily label to a 0..1 "calm/centred" score */
function moodToScore(label?: DayLabel): number {
  switch (label) {
    case "W+ Day": return 0.95;
    case "W Day":  return 0.85;
    case "M Day":  return 0.65;
    case "L Day":  return 0.35;
    default:       return 0.5; // neutral if unknown
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pct(n: number) {
  return Math.round(n);
}

/**
 * Compute daily conviction and EMA (N=10 period by default).
 * Heuristics:
 *  - Self-trust (kept/broken) carries the most weight.
 *  - Fresh evidence boosts; "anti-evidence" (didn't want to do) penalizes.
 *  - Focus ratio helps; distractions dilute.
 *  - Mood label reflects the calm/relaxed state that opens the subconscious.
 */
export function computeConvictionScore(inputs: ConvictionInputs): ConvictionBreakdown {
  const kept = Math.max(0, inputs.selfPromisesKept || 0);
  const broken = Math.max(0, inputs.selfPromisesBroken || 0);
  const totalPromises = kept + broken;
  const promiseScore = totalPromises > 0 ? kept / totalPromises : 0.5;

  const evPos = Math.max(0, inputs.evidenceAdds || 0);
  const evNeg = Math.max(0, inputs.antiEvidenceAdds || 0);
  // +1 smoothing avoids division by zero, and lets one side dominate gracefully
  const evidenceScore = (evPos + 1) / (evPos + evNeg + 1);

  const focus = Math.max(0, inputs.focusMinutes || 0);
  const distract = Math.max(0, inputs.distractionMinutes || 0);
  const focusScore = (focus + distract) > 0 ? focus / (focus + distract) : 0.5;

  const moodScore = moodToScore(inputs.moodLabel);

  // Weighted contribution -> raw hundred score
  const weighted =
      0.35 * promiseScore +
      0.25 * evidenceScore +
      0.15 * focusScore +
      0.25 * moodScore;

  let raw = weighted * 100;

  // Direct penalty for doing things you *did not* intend to do (anti-evidence).
  // Scale: -3 points each, capped at -20 for the day (tunable).
  const antiPenalty = Math.min(evNeg * 3, 20);
  raw = Math.max(0, raw - antiPenalty);
  raw = Math.min(100, raw);

  // EMA smoothing (N = 10)
  const periodN = 10;
  const alpha = 2 / (periodN + 1);
  const prev = Number.isFinite(inputs.prevEma as number)
    ? (inputs.prevEma as number)
    : raw; // first day: seed with today's raw

  const ema = pct(alpha * raw + (1 - alpha) * prev);

  return {
    raw: pct(raw),
    ema,
    components: {
      promiseScore: clamp01(promiseScore),
      evidenceScore: clamp01(evidenceScore),
      focusScore: clamp01(focusScore),
      moodScore: clamp01(moodScore),
      antiPenalty,
    },
  };
}
