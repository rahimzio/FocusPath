export type StatDetail = {
  level: number; // 0–99 (110 max with boost)
  xp: number; // 0–99 XP, level-up at 100
  lastUpdated: Date;
};

export type StatHistoryEntry = {
  date: Date;
  snapshot: Partial<FootballStatProfile>;
  label: string;
};

export interface FootballStatProfile {
  userId: string;
  speed: {
    sprint: StatDetail;
    topSpeed: StatDetail;
    agility: StatDetail;
  };
  endurance: {
    cooper: StatDetail;
    beepTest: StatDetail;
    treadmill: StatDetail;
  };
  momentum?: {
    statKeys: string[];
    bonus: number; // +3 temporary
    expiresAt: Date;
  };
  playstyles: string[];
  history: StatHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export function addXP(stat: StatDetail, xpGain: number): StatDetail {
  const total = stat.xp + xpGain;
  const levelUp = Math.floor(total / 100);
  return {
    ...stat,
    level: Math.min(stat.level + levelUp, 110),
    xp: total % 100,
    lastUpdated: new Date(),
  };
}

export function mapToRange(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(value, max));
  const percent = (clamped - min) / (max - min);
  return Math.round(percent * 99);
}

export function calculateSpeedStat(sprint30m: number, sprint60m: number): number {
  const explosivenessScore = mapToRange(sprint30m, 5.0, 3.6);
  const topspeedScore = mapToRange(sprint60m, 8.5, 7.0);
  return Math.round((explosivenessScore + topspeedScore) / 2);
}

export function calculateEnduranceStat(inputs: {
  cooperDistance?: number;
  beepLevel?: number;
  treadmillEffort?: number;
}): number {
  const values: number[] = [];

  if (inputs.cooperDistance)
    values.push(mapToRange(inputs.cooperDistance, 2200, 3700));
  if (inputs.beepLevel) values.push(mapToRange(inputs.beepLevel, 10, 17));
  if (inputs.treadmillEffort)
    values.push(mapToRange(inputs.treadmillEffort, 150, 300));

  if (!values.length) return 0;

  const product = values.reduce((acc, val) => acc * val, 1);
  return Math.round(product ** (1 / values.length));
}