export interface FrequencySubScores {
  conviction: number;
  emotionallyChargedThoughts: number;
  responses: number;
  focus: number;
  beliefs: number;
  expectations: number;
  perception: number;
}

export type WDay = 'L' | 'M' | 'W' | 'W+';

// Map W-Day label to score contribution
const wDayMapping: Record<WDay, number> = {
  L: 25,
  M: 60,
  W: 85,
  'W+': 95,
};

/**
 * Calculate the daily FrequencyScore (0–100) based on the 7 key subscores.
 */
export function calculateFrequencyScore(sub: FrequencySubScores): number {
  const score =
    0.20 * sub.conviction +
    0.20 * sub.emotionallyChargedThoughts +
    0.15 * sub.responses +
    0.15 * sub.focus +
    0.10 * sub.beliefs +
    0.10 * sub.expectations +
    0.10 * sub.perception;
  return Math.round(score);
}

export interface ExecutionMetrics {
  wDay: WDay; // L, M, W, W+
  taskCompletion: number; // 0–100
  goalProgress: number; // 0–100
  weights?: {
    wDay?: number;
    taskCompletion?: number;
    goalProgress?: number;
  };
}

/**
 * Calculate the ExecutionScore (0–100) using default weightings
 * W-Day mapping (50%), task completion (25%) and goal progress (25%).
 */
export function calculateExecutionScore(metrics: ExecutionMetrics): number {
  const weights = {
    wDay: 0.5,
    taskCompletion: 0.25,
    goalProgress: 0.25,
    ...metrics.weights,
  };

  const wDayScore = wDayMapping[metrics.wDay];
  const score =
    weights.wDay * wDayScore +
    weights.taskCompletion * metrics.taskCompletion +
    weights.goalProgress * metrics.goalProgress;

  return Math.round(score);
}

/**
 * Combine FrequencyScore and ExecutionScore into RealityScore.
 * RealityScore = 0.60 * FrequencyScore + 0.40 * ExecutionScore
 */
export function calculateRealityScore(
  frequencyScore: number,
  executionScore: number
): number {
  return Math.round(0.6 * frequencyScore + 0.4 * executionScore);
}

/**
 * Exponential Moving Average with alpha = 0.3 by default.
 */
export function calculateEMA(
  currentScore: number,
  previousEMA: number | undefined,
  alpha = 0.3
): number {
  if (previousEMA === undefined) return currentScore;
  return alpha * currentScore + (1 - alpha) * previousEMA;
}

export type FrequencyZone =
  | 'old-frequency'
  | 'mixed'
  | 'traction'
  | 'not-needing';

/**
 * Determine the zone for a given FrequencyScore.
 */
export function getFrequencyZone(score: number): FrequencyZone {
  if (score < 40) return 'old-frequency';
  if (score < 70) return 'mixed';
  if (score < 85) return 'traction';
  return 'not-needing';
}