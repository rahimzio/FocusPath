export type ConvictionInputs = {
  goalClarity: number;             // 1-10
  followThrough7d: number;         // 0-1
  winRate14d: number;              // 0-1
  streakDays: number;              // 0..∞ (clamp)
  decisionConsistency: number;     // 0-1
  decisionLatencyMin: number;      // in Minuten (weniger besser)
  selfConfidence: number;          // 1-10
  dayRatingVariance: number;       // 0..1 (0 stabil)
  contextSwitches: number;         // pro Tag
  prevEma?: number;                // optional für Glättung
};

const clamp = (x: number, min = 0, max = 1) => Math.max(min, Math.min(max, x));
const inv = (x: number) => clamp(1 - x); // invertierte Skala -> höher ist besser

export function computeConvictionScore(i: ConvictionInputs) {
  // Normalisieren 0..1
  const clarity = clamp(i.goalClarity / 10);
  const follow = clamp(i.followThrough7d);
  const win = clamp(i.winRate14d);
  const streak = clamp(i.streakDays / 14);           // 14 Tage = 1.0 (Cap)
  const consistency = clamp(i.decisionConsistency);
  const latency = clamp(i.decisionLatencyMin / 60);  // 60min = 1.0 → invert
  const selfConf = clamp(i.selfConfidence / 10);
  const emoVar = clamp(i.dayRatingVariance);         // 0 gut → invert
  const ctx = clamp(i.contextSwitches / 15);         // 15/Tag = 1.0 → invert

  const parts = {
    clarity: clarity * .10,
    follow:  follow  * .20,
    win:     win     * .15,
    streak:  streak  * .10,
    consist: consistency * .15,
    latency: inv(latency) * .05,
    self:    selfConf * .10,
    stable:  inv(emoVar) * .10,
    focus:   inv(ctx) * .05,
  } as const;

  const raw = Object.values(parts).reduce((a, b) => a + b, 0);  // 0..1
  const score = Math.round(raw * 100);

  // EMA(α=0.6) – smoother UI Wert
  const ema =
    i.prevEma == null ? score : Math.round(0.6 * score + 0.4 * i.prevEma);

  return  { score, ema, breakdown: parts };
}