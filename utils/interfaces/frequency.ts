import type { ObjectId } from 'mongodb';
import { MagnifyMaintainMode, MmState, TimeOfDay } from "./shared";

// --- Smoothing Config & State ---

export interface FrequencySmoothingCfg {
  windowDays: number;           // e.g., 14 or 21
  alpha: number;                // ~ 2/(N+1)
  maxDailyStep: {
    freqPct: number;            // max %-Punkte Änderung/Tag
    convPts: number;            // max Conviction-Punkte/Tag
  };
  kConv: number;                // Tagesimpuls für Conviction
  magnifyAlphaBoost: number;    // alpha * (1 + boost)
  magnifyStreakThreshold: number;
}

export interface FrequencyMetricsSmoothed {
  frequencySmoothed?: number;   // 0..100 (EWMA)
  convictionSmoothed?: number;  // 0..10 (EWMA)
  lastUpdateDate?: string;      // YYYY-MM-DD
  mmState?: MmState;
}

export interface FrequencyDocSmoothingExtension {
  metrics?: {
    alignmentScore?: number;
    frequencyScore?: number;
    lastDailyMoodScore?: number;
    updatedAt: Date;
    // NEW (smoothed)
    frequencySmoothed?: number;
    convictionSmoothed?: number;
    lastUpdateDate?: string;
    mmState?: { mode: MagnifyMaintainMode; streakPos: number; streakNeg: number };
  };
  smoothing?: FrequencySmoothingCfg;
}

// --- Domainmodelle V2 ---

export type BaseMoodPreference = {
  label: string;
  preference: 'gern' | 'egal' | 'nicht';
};

export interface FrequencyDocV2 /* extends import('mongodb').Document */ {
  _id?: ObjectId;
  type: 'frequency';
  userId: string;
  version?: number; // now 2
  base?: {
    baseFrequency: number;
    baseConviction: number;
    selfView: string[];
    emotion: string[];
    focusLeaks: string[];
    defaultReactions: string[];
    expectations: string[];
    baseMood?: string; // optional default
    updatedAt: Date;
    createdAt?: Date;
  };
  models?: {
    current?: { tags?: string[]; routine?: string[]; rules?: string[] } | null;
    ideal?:   { tags?: string[]; routine?: { text: string; priority?: number; ease?: number }[]; rules?: { text: string; priority?: number }[] } | null;
  };
  // NEW: preferences for moods + anchors lists
  baseMoodPreferences?: BaseMoodPreference[];
  frequencyAnchors?: { kind: 'music'|'breath'|'place'|'contact'|'other'; label: string; ref?: string }[];
  concentrationAnchors?: { label: string; note?: string }[];

  taskTemplates?: { name: string; points: number; isDont: boolean }[];
  metrics?: { alignmentScore?: number; frequencyScore?: number; lastDailyMoodScore?: number; updatedAt: Date };
  createdAt: Date;
  updatedAt: Date;
}

// --- Events / Logs ---

export interface BaseMoodLog /* extends import('mongodb').Document */ {
  _id?: ObjectId;
  type: 'frequency_baseMood_log';
  userId: string;
  date: string; // YYYY-MM-DD
  timeOfDay: TimeOfDay;
  moods: string[];
  score: number; // computed via preference weights
  createdAt: Date;
}

export interface AnchorCheckin /* extends import('mongodb').Document */ {
  _id?: ObjectId;
  type: 'anchor_checkin';
  userId: string;
  date: string; // YYYY-MM-DD
  kind: 'frequency' | 'concentration';
  label: string;
  done: boolean;
  createdAt: Date;
}

export interface DailySummary /* extends import('mongodb').Document */ {
  _id?: ObjectId;
  type: 'frequency_daily_summary';
  userId: string;
  date: string;
  moodAvg: number;
  moodCount: number;
  anchorsDone?: number;
  concentrationDone?: number;
  createdAt: Date;
}

// --- V1-Kompatibilität, falls noch benötigt ---

export type FrequencyBase = {
  baseFrequency: number;          // 0..10
  baseConviction: number;         // 0..10
  selfView: string[];
  emotion: string[];
  focusLeaks: string[];
  defaultReactions: string[];
  expectations: string[];
  updatedAt: Date;
  createdAt?: Date;
};

export type FrequencyTaskTemplate = {
  name: string;
  points: number;                 // 1..10
  isDont: boolean;                // DO(false) / DON'T(true)
};

export interface FrequencyDoc {
  _id?: ObjectId;
  type: 'frequency';              // discriminator
  userId: string;
  version?: number;
  base?: FrequencyBase;
  models?: {
    current?: { tags?: string[]; routine?: string[]; rules?: string[] } | null;
    ideal?: { tags?: string[]; routine?: { text: string; priority?: number; ease?: number }[]; rules?: { text: string; priority?: number }[] } | null;
  };
  taskTemplates?: FrequencyTaskTemplate[];
  createdAt: Date;
  updatedAt: Date;
}

/* --- bereits vorhandene Smoothing/Doc-Typen bleiben wie zuvor ... --- */

// 👇 NEU: Task-Instanzen unter appData als "frequency_task"
export interface FrequencyTaskInstance {
  _id?: ObjectId;
  type: "frequency_task";
  userId: string;
  name: string;
  points: number;                 // 1..10
  isDont: boolean;
  frequency: "daily";
  timebased: boolean;             // i.d.R. false
  category: "Frequenz" | string;
  status: "open" | "done";
  createdAt: Date;
  updatedAt: Date;
}

// 👇 NEU: Payload/Modelle für Frequency-Basis, -Current, -Ideal
export type FrequencyBasePayload = {
  userId: string;
  baseFrequency: number;   // 0..10
  baseConviction: number;  // 0..10
  selfView: string[];
  emotion: string[];
  focusLeaks: string[];
  defaultReactions: string[];
  expectations: string[];
};

export type FrequencyCurrent = {
  convictionNow?: number;  // 0..10
  baseline?: number;       // 0..100
  emo?: string[];
  leaks?: string[];
  patterns?: string[];     // 0..100 (aggregiert)
  tags?: string[];
  blockers?: string[];
};

export type FrequencyIdeal = {
  convictionTarget?: number; // 0..10
  habits?: string[];
  antiHabits?: string[];
  rules?: string[];
  routine?: string[];
};

// 👇 NEU: FrequencyProfile (ehemals separate Datei)
export interface FrequencyProfile {
  userId: string;
  createdAt: string;
  updatedAt?: string;

  // 🧠 Mindset & Verhalten
  responseToFailure: string;
  defaultReactionInStress: string;

  // ❤️ Emotionale Zielzustände
  coreEmotions: string[];
  additionalEmotionNotes?: string;

  // 🧭 Denkweise
  viewOnChallenges: number;       // 1–5
  decisionMakingStyle: number;    // 1=rational, 5=intuitiv

  // 💪 Selbstvertrauen & Überzeugung
  selfBeliefLevel: number;        // 1–5
  convictionStyle: string;

  // 🌟 Vision & Idealzustand
  idealDayDescription: string;
  idealMorningRoutine?: string;
  idealEveningRoutine?: string;

  // 💃 Körpersprache / Auftreten
  bodyLanguageTraits: string[];

  // 🧱 Werte
  coreValues: string[];
  customValues?: string[];

  // 🧹 Schattenmuster
  shadowPatterns: string[];
  forbiddenBehaviors: string[];

  // ✨ Inspiration
  inspirationPersona?: string;
  inspirationNotes?: string;
}

// ... Frequency-Modelle wie ergänzt zuvor bleiben

export interface AffirmationEntry {
  _id?: string;
  sentence: string;
  emotion: string;
  context?: string;
  createdAt: Date;
  active: boolean;
}

export interface MentalScene {
  _id?: string;
  description: string;
  person: string;
  comment: string;
  touch?: string;
  loopStyle?: "fade" | "cut";
  associatedEmotion: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface ManifestationProof {
  date: Date;
  proof: string;
  linkedGoalId?: string;
  category?: "visuell" | "zufall" | "synchronicity" | "emotion";
}

// ... bestehende Smoothed/Preview/Trend bleiben

export interface Commitment {
  _id: string;
  userId: string;
  title: string;
  dueDate: string; // ISO
  weight: "tiny" | "small" | "medium" | "big"; // +2/+3/+5/+8
  createdAt: string;
  status: "open" | "done" | "broken" | "rescoped";
  completedAt?: string;
  rescopedAt?: string;
  source?: { type: "task" | "manual"; refId?: string };
}

// Vereinheitlichtes ActionLog (kompatibel zu beiden Varianten)
export interface ActionLog {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  // kompatible Alias-Felder:
  logType?:
    | "commitment_done"
    | "commitment_broken"
    | "commitment_rescoped"
    | "unintended_action";
  typ?:
    | "commitment_done"
    | "commitment_broken"
    | "commitment_rescoped"
    | "unintended_action";
  meta?: { weight?: number; reason?: string; taskId?: string };
  createdAt: string;
}

export interface DailyMindset {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  beliefs: number;
  convictionSelf: number;
  perception: number;
  emotion: number;
  focus: number;
  reactions: number;     // "respond" > "react"
  expectations: number;
  heaven: number;        // Ruhe/Detachment 1–10
  neediness: number;     // Wichtigkeit 1–10
}

export interface DailyScores {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  conviction: number; // 0–100
  trustTank: number;  // 0–100
  frequency: number;  // 0–100
  details?: {
    followThrough7d?: number;
    decisionConsistency?: number;
    winRate14d?: number;
    clarity10?: number;
    selfConfidence10?: number;
    streakDays?: number;
    unintendedCount?: number;
  };
  createdAt: string;
}

// kleine Helper
export type AvoidItem = { id: string; label: string; active: boolean };
export type AvoidDailyItem = { id: string; label: string; didAvoid: boolean };
export type ReflectionBlock = "morning" | "afternoon" | "evening";

export type UserMe = {
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  avoidItems: AvoidItem[];
  timezone: string | null;
};
