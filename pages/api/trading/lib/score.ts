// pages/api/trading/lib/score.ts

export type BiasExec = "RR" | "RW" | "WR" | "WW";
export type SessionKey = "Asia" | "London" | "NewYork" | "Overlap";
export type Result = "win" | "loss" | "BE";

export function computeGameScore(opts: {
  biasExecution?: BiasExec;
  followedSetup?: boolean;
  respectedStopLoss?: boolean;
  managedRisk?: boolean;
  conceptsCount?: number;
  session?: SessionKey;
  result?: Result;
  breakEven?: boolean;
  stopHit?: boolean;
  mistakes?: string[];
}) {
  let score = 0;

  // Bias & Execution
  if (opts.biasExecution === "RR") score += 8 + 6;
  if (opts.biasExecution === "RW") score += 8; // right bias
  if (opts.biasExecution === "WR") score += 6; // right execution

  // Disziplin
  if (opts.followedSetup) score += 5;
  if (opts.respectedStopLoss) score += 5;
  if (opts.managedRisk) score += 5;

  // Confluences
  const conf = Math.min(5, Math.max(0, opts.conceptsCount ?? 0));
  score += conf * 1;

  // Session-Fit
  if (opts.session) score += 2;

  // Outcome
  if (opts.result === "win") score += 2;
  if (opts.breakEven) score += 0;
  if (opts.stopHit || opts.result === "loss") score -= 2;

  // Kritische Fehler
  const mistakes = opts.mistakes ?? [];
  const criticalSet = new Set(["SL verschoben", "Revenge", "Plan nicht befolgt", "Size zu groß"]);
  let criticalCount = mistakes.filter((m) => criticalSet.has(m)).length;
  criticalCount = Math.min(2, criticalCount);
  score -= criticalCount * 5;

  const grade = score >= 20 ? "A" : score >= 12 ? "B" : "C";
  return { score, grade: grade as "A" | "B" | "C" };
}

export function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(start);
  const n = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(end);
  if (!m || !n) return 0;
  const sh = Number(m[1]), sm = Number(m[2]);
  const eh = Number(n[1]), em = Number(n[2]);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return Math.max(0, endMin - startMin);
}
