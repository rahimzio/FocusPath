// Gemeinsame Basistypen & Utilities

export type MagnifyMaintainMode = 'maintain' | 'magnify';
export type Game = "A" | "B" | "C";
export type GameGrade = "A" | "B" | "C";

export type Period = { start: string; end: string };
export type YM = `${number}-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12"}`;
export type YQ = `${number}-Q${1|2|3|4}`;

export type TimeOfDay = 'morning' | 'noon' | 'evening';

export type MmState = {
  mode: MagnifyMaintainMode;
  streakPos: number;
  streakNeg: number;
};

// Utilities
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export const pctTone = (pct?: number | null) => {
  const v = typeof pct === 'number' ? pct : -1;
  if (v < 0) return 'bg-gray-200';
  if (v <= 39) return 'bg-red-400';
  if (v <= 69) return 'bg-yellow-400';
  if (v <= 89) return 'bg-green-400';
  return 'bg-yellow-100 border border-yellow-200';
};

// ... bestehende shared-Exports (MagnifyMaintainMode, Game, Period, YM, YQ, MmState, clamp, pctTone) bleiben ...

// ---------- User ----------
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;

  preferences?: {
    theme?: "light" | "dark";
    language?: string;
    dailyReminder?: boolean;
  };

  onboardingStep?: number;
  importantFields?: string[];
  baseFrequency?: number; // 0–10
  frequencyProfile?: {
    selfView?: string[];
    emotion?: string[];
    focusLeaks?: string[];
    defaultReactions?: string[];
    expectations?: string[];
    // entkoppelt von UI-Komponenten:
    currentModel?: Partial<import("./frequency").FrequencyCurrent>;
    idealModel?: Partial<import("./frequency").FrequencyIdeal>;
  };

  // Tages-/Wochen-/Monatsratings
  dailyRatingsAverage?: { [date: string]: { avg: number; rating: string } };
  weeklyRatingsAverage?: { [weekId: string]: { avg: number; rating: string } };
  monthlyRatingsAverage?: { [month: string]: { completedGoals: number; avg: number; rating: string } };

  trustReserveTank?: number;
  categories?: string[];

  subscription?: "free" | "pro" | "enterprise";
  linkedApps?: string[];

  trainingStats?: any;
  financeStats?: any;
  nutritionProfile?: any;
}

// ---------- User Settings / Config ----------
export interface UserSettings {
  startPage?: "todos" | "goals" | "finance";
  language?: "de" | "en";
  darkMode?: "auto" | "light" | "dark";
  weekStart?: "monday" | "sunday";
  timeFormat?: "24h" | "12h";
  defaultDuration?: string;
  defaultColor?: string;
  showGoalTasksSeparately?: boolean;
  dragSnap?: "15" | "30";
  allowReminders?: boolean;
  enableDayRating?: boolean;
  progressMode?: "even" | "weighted";
  compactMode?: boolean;
}

export interface UserConfigDocument {
  _id?: string;
  type?: "userConfig";
  userId: string;
  settings?: UserSettings;
  categories?: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Common API ----------
export interface OkResponse { ok: true; }

// ---------- Community ----------
import type { ObjectId } from "mongodb";

export type PostType = "update" | "survey" | "userTopic";
export type Category = "Bug Report" | "Feature Wunsch" | "Allgemein";

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // E-Mail-Adressen der Abstimmenden
}

export interface Comment {
  _id: ObjectId;
  userId: string;
  userEmail: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  upvotes: string[];   // userIds
  downvotes: string[]; // userIds
}

export interface CommunityPost {
  _id: ObjectId;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string; // E-Mail-Adresse
  type: PostType;
  category?: Category;    // nur bei userTopics
  comments?: Comment[];   // nur bei userTopics
  options?: PollOption[]; // nur bei Umfragen
  likes?: string[];       // User, die geliked haben
}

export interface Post {
  id: string;
  title: string;
  content: string;
  type: PostType;
  createdAt: string;
  category?: string;
  createdBy: string;
  options?: PollOption[];
  likes?: string[];
}
