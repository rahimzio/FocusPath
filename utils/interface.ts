/**
 * interfaces.ts
 * Gemeinsame Sammelstelle für DB- und App-Interfaces
 */

import { FileType2Icon } from "lucide-react";

// utils/interface.ts  (ergänzen)

// --- A/B/C Game Grundtypen ---
export type GameGrade = "A" | "B" | "C";

// Ein einzelner Game-Faktor, so wie er in der "trading"-Collection gespeichert wird
export interface GameLibraryItem {
  _id: string;          // Stringified ObjectId
  recordType: "gameLibrary";
  userId: string;
  label: string;        // z.B. "Plan befolgt"
  game: GameGrade;      // "A" | "B" | "C"
  points: number;       // A=3, B=2, C=1 (überschreibbar)
  active: boolean;      // default: true
  tags?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// API-Response von /api/trading/gameLibrary
export interface GameLibraryResponse {
  items: GameLibraryItem[];
  nextCursor?: string | null;
}

// Für die UI: aufbereitete Listen je Grade (so erwartet von TradeEntryForm)
export interface GameLibrary {
  A: string[]; // Labels der A-Faktoren
  B: string[]; // Labels der B-Faktoren
  C: string[]; // Labels der C-Faktoren
}

export type AccountType = "bank" | "broker" | "exchange" | "wallet";

export type FinanceKind =
  | "income"
  | "expense"
  | "saving"
  | "saving_goal"
  | "account"
  | "transaction"
  | "symbol"          // Mapping für Preise (CoinGecko/Alpha Vantage)
  | "weekly_budget"   // falls genutzt
  | "price_snapshot"  // optional: tägliche Preise in derselben Collection
  | "price_latest"    // optional: letzter Preis je Symbol
  | "weekly_metrics"; // optional: wöchentliche KPIs
export interface PortfolioAccount {
  _id?: string;
  userId: string;
  name: string;            // z.B. "N26", "Binance Main", "Trade Republic"
  provider?: string;       // Freitext / App-Name
  type: AccountType;
  baseCurrency: string;    // z.B. "EUR"
  createdAt: string;
  updatedAt: string;
}
export interface FinanceAccount extends FinanceBase {
  kind: "account";
  userId: string;
  name: string;
  provider?: string;
  type: AccountType;
  baseCurrency: string; // "EUR" etc.
}
export type AssetClass = "cash" | "crypto" | "stock" | "etf" | "other";
export interface FinanceBase {
  _id?: string;
  kind: FinanceKind;
  userId?: string;     // global=optional (z. B. symbol)
  createdAt: string;
  updatedAt: string;
  archived?: boolean;      // ⬅️ neu
  archivedAt?: string;  
}
export type TransactionKind =
  | "cash_deposit" | "cash_withdrawal"
  | "asset_buy" | "asset_sell"
  | "asset_transfer_in" | "asset_transfer_out"
  | "cash_transfer_in" | "cash_transfer_out";
export interface FinanceSaving extends FinanceBase {
  kind: "saving";
  userId: string;
  month: string;       // "YYYY-MM"
  amount: number;
  note?: string;
}

export interface FinanceTransaction extends FinanceBase {
  kind: "transaction";
  userId: string;
  accountId: string;     // _id von FinanceAccount (String)
  date: string;          // ISO
  transactionKind: TransactionKind;
  note?: string;

  // Asset-Daten (für asset_*)
  asset?: { class: AssetClass; symbol: string; name?: string };
  units?: number;        // bei asset_*
  pricePerUnit?: number; // bei asset_buy/sell
  fee?: number;          // optional, in Account-Währung
  cashAmount?: number;   // cash_* oder asset_* (Preis*Units +/- Fee)
}
export interface FinancePriceSnapshot extends FinanceBase {
  kind: "price_snapshot";
  userId?: string;
  class: AssetClass | "fx";
  symbol: string;
  date: string;          // "YYYY-MM-DD" (Berlin)
  price: { eur?: number; usd?: number };
  provider: "coingecko" | "alphavantage";
  meta?: any;
}
export interface FinanceSymbol extends FinanceBase {
  kind: "symbol";
  userId?: string; // null/global
  class: AssetClass;
  symbol: string;         // "BTC", "AAPL", "VWCE"
  name?: string;
  providers?: { coingeckoId?: string; alphaTicker?: string };
}

export interface FinancePriceLatest extends FinanceBase {
  kind: "price_latest";
  userId?: string;
  class: AssetClass | "fx";
  symbol: string;
  asOfDate: string;      // "YYYY-MM-DD"
  price: { eur?: number; usd?: number };
  provider: string;
}

export type FinanceDoc =
  | FinanceIncome | FinanceExpense | FinanceSaving | FinanceSavingGoal
  | FinanceAccount | FinanceTransaction | FinanceSymbol
  | FinancePriceSnapshot | FinancePriceLatest | FinanceWeeklyMetrics;
export interface FinanceWeeklyMetrics extends FinanceBase {
  kind: "weekly_metrics";
  userId: string;
  week: string;          // "YYYY-ww"
  savingRate: number;
  expenseGrowth: number;
  investmentROI: number;
  emergencyFund: { current: number; target: number };
  netWorth?: number;
}
export interface FinanceSavingGoal extends FinanceBase {
  kind: "saving_goal";
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  deadline?: string;   // ISO (optional)
}
export interface FinanceExpense extends FinanceBase {
  kind: "expense";
  userId: string;
  amount: number;
  dueDate: string;     // ISO
  category?: string;
  note?: string;
}
export interface FinanceIncome extends FinanceBase {
  kind: "income";
  userId: string;
  month: string;       // "YYYY-MM"
  amount: number;
  source?: string;
  note?: string;
}
export interface PortfolioTransaction {
  _id?: string;
  userId: string;
  accountId: string;
  date: string;            // ISO
  note?: string;

  // Klassischer Portfolio-Event
  kind:
    | "cash_deposit"     // externer Zufluss (zählt als Ersparnis)
    | "cash_withdrawal"  // externer Abfluss
    | "asset_buy"
    | "asset_sell"
    | "asset_transfer_in"
    | "asset_transfer_out"
    | "cash_transfer_in"
    | "cash_transfer_out";

  // Asset-Daten (für asset_* Events)
  asset?: {
    class: AssetClass;    // crypto/stock/etf/other
    symbol: string;       // "BTC", "AAPL", "VWCE"
    name?: string;
  };

  // Beträge
  units?: number;         // Stück/Coins (bei asset_* und transfers)
  pricePerUnit?: number;  // Preis in account.baseCurrency (bei asset_buy/sell)
  fee?: number;           // optional in account.baseCurrency
  cashAmount?: number;    // Bar-Betrag in account.baseCurrency (bei cash_* oder asset_*)

  createdAt: string;
  updatedAt: string;
}
import type { ObjectId} from 'mongodb';
export type MagnifyMaintainMode = 'maintain' | 'magnify';
export interface FrequencySmoothingCfg {
  windowDays: number           // e.g., 14 or 21
  alpha: number                // ~ 2/(N+1), e.g., 0.12 for 14d, 0.09 for 21d
  maxDailyStep: {              // hard caps per rollup
    freqPct: number            // e.g., 4 %-Punkte max Veränderung pro Tag
    convPts: number            // e.g., 0.1 Punkte Conviction pro Tag
  }
  kConv: number                // Tagesimpuls für Conviction (klein, z. B. 0.4)
  magnifyAlphaBoost: number    // wenn in Magnify → alpha * (1 + boost), z. B. 0.15 (15%)
  magnifyStreakThreshold: number // ab wie vielen positiven Tagen Magnify aktiv wird (z. B. 7)
}

export interface FrequencyMetricsSmoothed {
  frequencySmoothed?: number   // 0..100, EWMA
  convictionSmoothed?: number  // 0..10, EWMA (um Baseline herum)
  lastUpdateDate?: string      // YYYY-MM-DD des letzten Rollups
  mmState?: {                  // aktueller Modus + Streaks
    mode: MagnifyMaintainMode
    streakPos: number
    streakNeg: number
  }
}

// Erweitere dein bestehendes Frequency-Dokument (FrequencyDoc / FrequencyDocV2)
// Beispiel (füge Felder hinzu, ohne das bestehende Interface zu brechen):
export interface FrequencyDocSmoothingExtension {
  metrics?: {
    alignmentScore?: number
    frequencyScore?: number
    lastDailyMoodScore?: number
    updatedAt: Date
    // NEW (smoothed)
    frequencySmoothed?: number
    convictionSmoothed?: number
    lastUpdateDate?: string
    mmState?: { mode: MagnifyMaintainMode; streakPos: number; streakNeg: number }
  }
  smoothing?: FrequencySmoothingCfg
}

export type TimeOfDay = 'morning' | 'noon' | 'evening'

export type BaseMoodPreference = {
  label: string
  preference: 'gern' | 'egal' | 'nicht'
}

export interface FrequencyDocV2 /* extends import('mongodb').Document */ {
  _id?: ObjectId
  type: 'frequency'
  userId: string
  version?: number // now 2
  base?: {
    baseFrequency: number
    baseConviction: number
    selfView: string[]
    emotion: string[]
    focusLeaks: string[]
    defaultReactions: string[]
    expectations: string[]
    baseMood?: string // optional default
    updatedAt: Date
    createdAt?: Date
  }
  models?: {
    current?: { tags?: string[]; routine?: string[]; rules?: string[] } | null
    ideal?:   { tags?: string[]; routine?: { text: string; priority?: number; ease?: number }[]; rules?: { text: string; priority?: number }[] } | null
  }
  // NEW: preferences for moods + anchors lists
  baseMoodPreferences?: BaseMoodPreference[]
  frequencyAnchors?: { kind: 'music'|'breath'|'place'|'contact'|'other'; label: string; ref?: string }[]
  concentrationAnchors?: { label: string; note?: string }[]

  taskTemplates?: { name: string; points: number; isDont: boolean }[]
  metrics?: { alignmentScore?: number; frequencyScore?: number; lastDailyMoodScore?: number; updatedAt: Date }
  createdAt: Date
  updatedAt: Date
}

// appData events (no auto-creation of collection!)
export interface BaseMoodLog /* extends import('mongodb').Document */ {
  _id?: ObjectId
  type: 'frequency_baseMood_log'
  userId: string
  date: string // YYYY-MM-DD
  timeOfDay: TimeOfDay
  moods: string[]
  score: number // computed via preference weights
  createdAt: Date
}

export interface AnchorCheckin /* extends import('mongodb').Document */ {
  _id?: ObjectId
  type: 'anchor_checkin'
  userId: string
  date: string // YYYY-MM-DD
  kind: 'frequency' | 'concentration'
  label: string
  done: boolean
  createdAt: Date
}

export interface DailySummary /* extends import('mongodb').Document */ {
  _id?: ObjectId
  type: 'frequency_daily_summary'
  userId: string
  date: string
  moodAvg: number
  moodCount: number
  anchorsDone?: number
  concentrationDone?: number
  createdAt: Date
}
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
    current?: FrequencyCurrent | null;
    ideal?: FrequencyIdeal | null;
  };
  // Optional, nur Vorlagen (keine Instanzen):
  taskTemplates?: FrequencyTaskTemplate[];
  createdAt: Date;
  updatedAt: Date;
};

// Tasks (Instanzen) gehen in appData, als „frequency_task“ markiert.
export interface FrequencyTaskInstance {
  _id?: ObjectId;
  type: 'frequency_task';
  userId: string;
  name: string;
  points: number;                 // 1..10
  isDont: boolean;
  frequency: 'daily';
  timebased: boolean;             // i.d.R. false
  category: 'Frequenz' | string;
  status: 'open' | 'done';
  createdAt: Date;
  updatedAt: Date;
};
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
  convictionNow?: number; // 0..10
  baseline?: number;      // 0..100
  emo?: string[];
  leaks?: string[];
  patterns?: string[];          // 0..100 (aggregiert)
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
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;

  preferences?: {
    theme?: 'light' | 'dark';
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
    currentModel?: Partial<import('../components/frequenz/StepFormCurrent').FrequencyCurrent>;
    idealModel?: Partial<import('../components/frequenz/StepFormIdeal').FrequencyIdeal>;
  };
  // Für jeden Tag speichern wir nun { avg: number; rating: string }
  dailyRatingsAverage?: {
    [date: string]: {
      avg: number;
      rating: string;
    };
  };

  // Für jede Kalenderwoche ebenfalls { avg: number; rating: string }
  weeklyRatingsAverage?: {
    [weekId: string]: {
      avg: number;
      rating: string;
    };
  };

  // Für jeden Monat speichern wir zusätzlich completedGoals,
  // dazu avg und letter-Rating
  monthlyRatingsAverage?: {
    [month: string]: {
      completedGoals: number;
      avg: number;
      rating: string;
    };
  };

  trustReserveTank?: number;
  categories?: string[];

  subscription?: 'free' | 'pro' | 'enterprise';
  linkedApps?: string[];

  trainingStats?: any;
  financeStats?: any;
  nutritionProfile?: any;
}

/* -------------------------------------
 *          DB (Mongo) INTERFACES
 * ------------------------------------- */
export interface UserConfigDocument {
  _id?: string;
  type?: "userConfig";
  userId: string;
  settings?: UserSettings;
  categories?: string[];
  createdAt: string;
  updatedAt: string;
}

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
export interface TaskDocument {
  userId?: string;
  _id?: ObjectId;
  name: string;
  description: string;
  points: number;
  status: "incomplete" | "completed";
  dueDate: string;  // z.B. "2025-01-01"
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  timebased: boolean;
  time: string;      // z.B. "08:00"
  progress: number;  // 0-100%
  goalId?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  duration?: string;
  excludedDates?: string[];
  subTasks?: SubTask[];
  /** Wochentage, an denen die Aufgabe erscheinen soll (0=Sonntag) */
  daysOfWeek?: number[];
  /** Intervall für Wiederholungen in Tagen */
  interval?: number;
  // ggf. weitere Felder
}

export interface GoalDocument {
  userId?: string;
  _id: ObjectId;
  title: string;
  description: string;
  dueDate: string;
  progress: number;      // 0-100%
  tasks?: string[];       // Liste von Task-IDs als string
  createdAt: string;
  parentGoalId?: string;
  updatedAt: Date;
  category?: string;
  reward?: {
    type: string;
    value: any;
  };
  // ggf. weitere Felder
}

/* -------------------------------------
 *         APP/Frontend INTERFACES
 * ------------------------------------- */

export interface Task {
  category: string;
  userId?: string;
  _id: string;
  id?: string;
  name: string;
  description: string;
  points: number;
  status?: TaskStatus;
     // ISO-String
  frequency?: TaskFrequency;
  linkedApps: string[];
  timebased: boolean;
  time: string;             // "08:00"
  progress: number;         // 0-100%
  createdAt: string;
  updatedAt: string;
  duration?: string;
  goalId?: string;
  color?: string;
  excludedDates?: string[];
  reward?: {
    type: string;           // "badge" | "points" | ...
    value: any;             // "Gold-Badge" | 50 | ...
  };
  dependencies?: string[];  // Abhängigkeiten zwischen Tasks
  subTasks?: SubTask[];
  /** Wochentage, an denen die Aufgabe erscheinen soll (0=Sonntag) */
  daysOfWeek?: number[];
  /** Intervall für Wiederholungen in Tagen */
  interval?: number;
}

/**
 * Goals im App-Kontext.
 * Hier kann _id ein string sein.
 */export type GoalType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "mental";

export interface Goal {
  userId?: string;
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  progress: number;     // 0-100%
  tasks?: Task[];     // Task-IDs im String-Format
  createdAt: string;
  endDate: string;
  startDate: string;
  category?: string;
  goalType?: GoalType; // bevorzugt
  type?: GoalType; 
  completedAt?: string;
  updatedAt: string;
  subGoals: Goal[];
  parentGoalId?: string;
  reward?: {
    type: string;
    value: any;
  };
}
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  // Legacy / tolerierte Varianten:
  | "complete"
  | "completed"
  | "incomplete"
  | "open"
  | string;
export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "yearly";

/**
 * Optionales Interface, falls du
 * die "Goal + Progress-Infos" kombiniert brauchst.
 */
export interface GoalWithProgress extends Goal {
  totalTasks: number;
  completedTasks: number;
  // Im Basis-Goal ist progress/dueDate/tasks optional.
  // Hier kannst du sie auf Pflicht setzen, wenn du möchtest:
  dueDate: string;
  tasks?: Task[];
}



export interface CreateTaskBody {
  category: string;
  userId?: string;
  name: string;
  description: string;
  points: number;
  dueDate: string;
  frequency?: TaskFrequency;
  linkedApps?: string[];
  timebased?: boolean;
  time?: string;
  goalId?: string;
  subTasks?: SubTask[];
  color?: string;
  duration?: string;
  daysOfWeek?: number[];
  interval?: number;
  status?: TaskStatus;
}
export interface SubTask {
  userId?: string;
  _id?: string;
  name: string;
  description?: string;
  points?: number;
  dueDate?: string;   // Fälligkeitsdatum
  time?: string;      // Uhrzeit
  showInDaily?: boolean; // Häkchen  weight?: number;
  status?: TaskStatus;
}

/**
 * Neue Schnittstelle für Completions
 */
export interface Completion {
  _id?: ObjectId;
  taskId: string;
  date: string;
  status: "completed" | "incomplete";
}


// frequencyProfile.ts

export interface FrequencyProfile {
  userId: string;
  createdAt: string;
  updatedAt?: string;

  // 🧠 Mindset & Verhalten
  responseToFailure: string; // z.B. "Ich nehme es als Lernmöglichkeit."
  defaultReactionInStress: string; // z.B. "Ich atme tief durch und bleibe ruhig."

  // ❤️ Emotionale Zielzustände
  coreEmotions: string[]; // z.B. ["Dankbarkeit", "Freude"]
  additionalEmotionNotes?: string;

  // 🧭 Denkweise
  viewOnChallenges: number; // Skala 1–5
  decisionMakingStyle: number; // 1 = rational, 5 = intuitiv

  // 💪 Selbstvertrauen & Überzeugung
  selfBeliefLevel: number; // 1 = Ich zweifle stark, 5 = Ich weiß, dass ich alles schaffen kann
  convictionStyle: string; // z. B. „Ich handle entschlossen, egal wie es aussieht von außen“

  // 🌟 Vision & Idealzustand
  idealDayDescription: string;
  idealMorningRoutine?: string;
  idealEveningRoutine?: string;

  // 💃 Körpersprache / Auftreten
  bodyLanguageTraits: string[]; // z.B. ["aufrecht", "ruhig", "kraftvoll"]

  // 🧱 Werte
  coreValues: string[]; // z.B. ["Klarheit", "Authentizität", "Liebe"]
  customValues?: string[];

  // 🧹 Schattenmuster
  shadowPatterns: string[]; // z.B. ["Perfektionismus", "Vergleichen"]
  forbiddenBehaviors: string[]; // Liste der Dinge, die der User vermeiden will

  // ✨ Inspiration
  inspirationPersona?: string; // z.B. "Zuko aus Avatar"
  inspirationNotes?: string;


}


export type PostType = "update" | "survey" | "userTopic";
export type Category = "Bug Report" | "Feature Wunsch" | "Allgemein";

export interface CommunityPost {
  _id: ObjectId;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string; // E-Mail-Adresse
  type: "update" | "survey" | "userTopic";
  category?: "Bug Report" | "Feature Wunsch" | "Allgemein"; // Nur bei userTopics
  comments?: Comment[]; // Nur bei userTopics
  options?: PollOption[]; // Nur bei Umfragen
  likes?: string[]; // User, die den Post geliked haben
}

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
  upvotes: string[]; // userIds
  downvotes: string[]; // userIds
}

export interface Post {
  id: string;
  title: string;
  content: string;
  type: "update" | "survey" | "userTopic";
  createdAt: string;
  category?: string;
  createdBy: string;
  options?: PollOption[];
  likes?: string[];
}export interface CreateGoalBody {
  userId: string;
  title: string;
  description?: string;

  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd

  goalType: GoalType;
  type?: GoalType;   // fallback

  category?: string;
  tasks?: CreateTaskBody[];

  // Optional sofort gesetzt:
  subGoals?: Goal[];   // selten beim Create
  weight?: number;
}export interface GetGoalsResponse {
  goals: Goal[];
}

export interface CreateGoalResponse {
  goal: Goal;
}

export interface OkResponse {
  ok: true;
}

export interface Account {
  _id?: string;
  userId: string;
  name?: string;
  broker?: string;
  currency?: string;          // "USD" | "EUR" | …
  startingBalance?: number;   // optional
  riskPerTrade?: number;      // % optional
  createdAt?: string;
  updatedAt?: string;
}

export type Grade = "A" | "B" | "C";
export type BiasExec = "RR" | "RW" | "WR" | "WW";
export type SessionKey = "Asia" | "London" | "NewYork" | "Overlap";

export interface Concept {
  name: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe?: string;
  note?: string;
}

export interface TradeEntry {
  _id?: string;
  accountId?: string;
  userId: string;
  date: string;                // YYYY-MM-DD
  symbol: string;

  // Meta / Strategie
  setup?: string;
  strategy?: string;
  strategy_name?: string;
  strategy_result?: "win" | "loss";

  // Ausführung
  tradeType?: "buy" | "sell";
  entry?: number;
  exit?: number;
  lotSize?: number;
  pnl?: number;
  rating?: number;

  // Risiko & Ziele
  stopLoss?: number;           // legacy
  stopPrice?: number;          // kanonisch
  targetPrice?: number;
  potentialLoss?: number;
  riskReward?: string;

  // Ergebnis
  result: "win" | "loss" | "BE"| "ongoing";

  // Zeiten / Session
  entryTime?: string;
  exitTime?: string;
  startTime?: string;
  endTime?: string;
  durationMin?: number;
  session?: SessionKey;

  // Kontext / Qualität
  confluences?: string[];
  tags?: string[];
  ruleViolations?: string[];
  concepts?: Concept[];
  viewTimeframes?: string[];
  entryTimeframe?: string;
  rangeDefined?: boolean;
  rangeNote?: string;
  location?: string;

  // Bias & Fehler
  tradingMistakes?: string[];
  biasExecution?: BiasExec;
  outcomeFlags?: { breakEven?: boolean; stopHit?: boolean };

  // Mentales
  emotionBefore?: string;
  triggerEvent?: string;
  mentalMistake?: string;
  performanceState?: Grade;
  followedSetup?: boolean;
  respectedStopLoss?: boolean;
  managedRisk?: boolean;
  disciplineScore?: number;
  tiltDetected?: boolean;

  // Game
  gameComputed?: Grade;
  gameSelf?: Grade;

  // Linking
  strategyId?: string;
  linkedGoalId?: string;

  // Texte
  tradeSummaryText?: string;
  reflectionNotes?: string;
  embeddingSourceText?: string;

  // Lifecycle
  status?: "draft" | "final";
  completed?: boolean;
  missing?: string[];
  createdAt?: string;
  updatedAt?: string;

  // Media
  screenshotUrl?: string;

  notes?: string[];
}




export interface TradeEntryVectorReady extends TradeEntry {
  tradeSummaryText: string;
  reflectionNotes: string;
  ruleViolationsVector: string[];
  tagsVector: string[];
  setupVector: string;
  embeddingSourceText: string;
}
// --------------------
// Online-Studium Module
// --------------------

export interface Unit {
  _id: string;
  title: string;
  status: "not-started" | "in-progress" | "completed";
  note?: string;
}

export interface Chapter {
  _id: string;
  title: string;
  units: Unit[];
}
export interface GameItem {
  _id?: string;
  userId?: string | null;
  label: string;
  grade: Grade;
  score: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface OnlineModule {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  totalUnits: number;
  completedUnits: number;
  chapters: Chapter[];
  startDate?: string;
  endDate?: string;
  linkedTasks?: string[];
}

export interface SavingEntry {
  userId: string;
  month: string;           // z. B. "2025-07"
  amount: number;
  note?: string;
  createdAt: string;       // ISO-DateTime-String
  updatedAt: string;       // ISO-DateTime-String
}

export interface SavingGoal {
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  deadline?: string; // ISO-Date oder leerer String
  createdAt: string;
  updatedAt: string;
  _id?: string; // falls von MongoDB mitgeliefert
}

export interface expense {
  _id?: string;
  userId?: string; // Optional falls später ergänzt
  name: string;
  amount: number;
  category: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | string; // Erweiterbar
  dueDate: string; // Format: "YYYY-MM-DD"
  createdAt: string; // ISO-Format
  updatedAt: string; // ISO-Format
  note?: string;
}


export interface BudgetCategoryEntry {
  name: string;
  amount: number;
}

export interface BudgetEntry {
  _id?: string;
  userId: string;
  week: string; // z. B. "2025-29"
  budget: number;
  spent: number;
  categories: BudgetCategoryEntry[];
  createdAt: string;
  updatedAt: string;
  rating?: "L" | "M" | "W" | "W+";
}

export interface IncomeEntry {
  userId: string;
  month: string; // Format: "YYYY-MM"
  amount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}


export interface UserAccount {
  userId: string;
  balance: number;
  equity_curve: { date: string; value: number }[];
  used_margin: number;
  available_margin: number;
}

export interface WeeklyStat {
  _id?: string;
  userId: string;
  week_start: string;
  best_pair: string;
  win_rate: number; // 0 - 1
  pct_change: number;
  top_pairs: { pair: string; win_rate: number }[];
  createdAt?: string;
}

export interface Strategy {
  _id?: string;
  userId: string;
  name: string;
  description?: string;
  tag_color?: string;
  createdAt?: string;
}

export interface TradeMistake {
  _id?: string;
  userId: string;
  tradeId: string;
  mistake_type: "StopLossVergessen" | "ZuSpätAusgestoppt" | string;
  notes?: string;
  createdAt?: string;
}
// Manifestation Tools ------------------------------
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
// Commitment & Scoring Models
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

export interface ActionLog {
  _id: string;
  userId: string;
  date: string; // Tagesbucket YYYY-MM-DD
  typ: "commitment_done" | "commitment_broken" | "commitment_rescoped" | "unintended_action";
  meta?: {
    weight?: number; // z.B. 2/3/5/8
    reason?: string;
    taskId?: string;
  };
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
  reactions: number;
  expectations: number;
  heaven: number;
  neediness: number;
}

export interface DailyScores {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  conviction: number; // 0–100
  trustTank: number; // 0–100
  frequency: number; // 0–100
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

export interface ActionLog {
  _id: string;
  userId: string;
  date: string; // Tagesbucket YYYY-MM-DD
  FileType2Icon: "action_log";
  logType:
    | "commitment_done"
    | "commitment_broken"
    | "commitment_rescoped"
    | "unintended_action";
  meta?: {
    weight?: number;
    reason?: string;
    taskId?: string;
  };
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
  reactions: number; // "respond" > "react"
  expectations: number;
  heaven: number; // Ruhe/Detachment 1–10
  neediness: number; // Wichtigkeit 1–10
}

export interface DailyScores {
  _id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  conviction: number; // 0–100
  trustTank: number; // 0–100
  frequency: number; // 0–100
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

export type AvoidItem = { id: string; label: string; active: boolean };
export type AvoidDailyItem = { id: string; label: string; didAvoid: boolean };
export type ReflectionBlock = "morning" | "afternoon" | "evening";

export type UserMe = {
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  avoidItems: AvoidItem[];
  timezone: string | null;
};