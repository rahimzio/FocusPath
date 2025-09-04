// utils/frequency/conviction.ts
export type ConvictionInputs = {
  baseConviction: number; // 0..10
  convictionNow?: number; // 0..10
  convictionTarget?: number; // 0..10
  doPoints?: number;   // Summe Tages-DOs (positiv)
  dontPoints?: number; // Summe Tages-DON’Ts (negativ gedacht)
};

export function computeConvictionScore({
  baseConviction,
  convictionNow,
  convictionTarget,
  doPoints = 0,
  dontPoints = 0,
}: ConvictionInputs) {
  // simple first pass: Start an Base, bias in Richtung current/target, DOs heben, DON’Ts senken
  const now = typeof convictionNow === 'number' ? convictionNow : baseConviction;
  const target = typeof convictionTarget === 'number' ? convictionTarget : baseConviction;
  const towardTarget = (target - now) * 0.25; // 25% Annäherung
  const taskDelta = normalize(doPoints) - normalize(dontPoints);
  let result = baseConviction + towardTarget + taskDelta;

  // clamp
  result = Math.max(0, Math.min(10, Math.round(result * 10) / 10));
  return result;
}

function normalize(x: number) {
  // z. B. 0..10 skaliert auf ~ -1..+1 Einflussspanne
  const c = Math.max(0, Math.min(10, x));
  return c / 10;
}
