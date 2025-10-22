import { Game, GameGrade, Period, YM, YQ } from "./shared";

/* ---------------------------------- */
/* Basics & Unions                    */
/* ---------------------------------- */

export type Grade = "S" | "A" | "B" | "C";             // ⇦ S ergänzt
export type BiasExec = "RR" | "RW" | "WR" | "WW";
export type SessionKey = "Asia" | "London" | "NewYork" | "Overlap";
export type Result = "win" | "loss" | "BE";            // Drafts: result = undefined

export interface Concept {
  name: string;
  direction?: "bullish" | "bearish" | "neutral";
  timeframe?: string;
  note?: string;
}

export interface PartialExit {
  label?: string;
  price?: number;
  percent?: number; // 0..100
  at?: string;      // ISO oder HH:mm
  note?: string;
}

/* ---------------------------------- */
/* Analytics-Trade (unverändert grob) */
/* ---------------------------------- */

export type Trade = {
  _id: string;
  userId: string;
  date: string;
  setup: string;
  rMultiple: number;
  pnl: number;
  complianceScore?: number;  // 0–100
  game?: Game;               // A/B/C je Trade (Analytics kann S optional gesondert führen)
  mae?: number;
  mfe?: number;
  session?: "open" | "mid" | "close";
  rulesBroken?: string[];
  setupValid?: boolean;
  riskAdhered?: boolean;
  executionTiming?: "early" | "ok" | "late" | null;
};

/* ---------------------------------- */
/* Reflections                        */
/* ---------------------------------- */

export type WeeklyReflection = {
  userId: string;
  label: string;  // z.B. "2025-09 W3"
  period: Period;
  kpis: {
    trades: number; pnl: number; winrate: number;
    expectancyR: number; avgR: number; maxDD: number; daysTraded: number;
    complianceAvg: number;
    gameAvg: { S: number; A: number; B: number; C: number }; // ⇦ S ergänzt
    tiltSessions: number;
  };
  gameStats: {
    // ⇦ auf Grade umgestellt, damit S auftaucht
    byGame: Array<{
      game: Grade;
      trades: number;
      wins: number;
      losses: number;
      winrate: number;
      avgR: number;
      expectancyR: number;
      complianceAvg?: number;
    }>;
    overall: { S: number; A: number; B: number; C: number };
  };
  processKPIs: {
    complianceAvg: number;
    setupValidityRate?: number;
    riskAdherenceRate?: number;
    executionTimingDist?: { early: number; ok: number; late: number };
    matrix: {
      goodProcess_goodOutcome: number;
      goodProcess_badOutcome: number;
      badProcess_goodOutcome: number;
      badProcess_badOutcome: number;
    };
    pqi?: number;
  };
  // ⇦ abcg auf Grade geändert (vorher Game), damit S möglich ist
  miniDaily: Array<{ date: string; abcg: Grade; discipline: number; r?: number; pnl?: number; tilt?: boolean }>;
  createdAt: string;
};

export type MonthlyReflection = {
  userId: string;
  month: YM;
  period: Period;
  weeks: WeeklyReflection[]; // exakt 4
  kpis: WeeklyReflection["kpis"];
  processKPIs: WeeklyReflection["processKPIs"] | null;
  createdAt: string;
};

export type QuarterlyReflection = {
  userId: string;
  quarter: YQ;
  period: Period;
  months: MonthlyReflection[]; // exakt 3
  kpis: MonthlyReflection["kpis"];
  processKPIs: WeeklyReflection["processKPIs"] | null;
  createdAt: string;
};

/* ---------------------------------- */
/* Game Library                       */
/* ---------------------------------- */

export interface GameLibraryItem {
  _id: string;                 // Stringified ObjectId (ID wird in Entries verwendet)
  recordType: "gameLibrary";
  userId: string;
  label: string;               // z.B. "Plan befolgt"
  game: GameGrade;             // "A" | "B" | "C" (Library selbst bleibt A/B/C)
  points: number;              // Default A=3, B=2, C=1 (überschreibbar)
  active: boolean;             // default: true
  tags?: string[];
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameLibraryResponse {
  items: GameLibraryItem[];
  nextCursor?: string | null;
}

export interface GameLibrary {
  A: string[]; // Labels der A-Faktoren
  B: string[]; // Labels der B-Faktoren
  C: string[]; // Labels der C-Faktoren
}

/* ---------------------------------- */
/* Accounts                           */
/* ---------------------------------- */

export interface Account {
  _id?: string;
  userId: string;
  name?: string;
  broker?: string;
  currency?: string;          // "USD" | "EUR" | …
  startingBalance?: number;
  currentBalance?: number;    // von API getAllAccounts geliefert
  realizedPnl?: number;       // optional
  riskPerTrade?: number;      // %
  createdAt?: string;
  updatedAt?: string;
}

export interface UserAccount {
  userId: string;
  balance: number;
  equity_curve: { date: string; value: number }[];
  used_margin: number;
  available_margin: number;
}

/* ---------------------------------- */
/* Journal Trade Entry (kanonisch)    */
/* ---------------------------------- */

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

  // Ergebnis (Drafts: undefined)
  result?: Result;

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

  // Mentales & Reflection
  emotionBefore?: string;
  triggerEvent?: string;
  mentalMistake?: string;
  performanceState?: Grade;
  followedSetup?: boolean;
  respectedStopLoss?: boolean;
  managedRisk?: boolean;
  disciplineScore?: number;
  tiltDetected?: boolean;
  reflectionNotes?: string;

  // Process-Felder (angepasst)
  strategyAdherence?: "yes" | "partial" | "no";
  processIntent?: string;
  processFocus?: string[];      // ⇦ geändert: war string, jetzt string[]
  ifThenPlan?: string;
  processNotes?: string;
  luckFactor?: "positive" | "neutral" | "negative"; // ⇦ geändert: war number

  // Zusätzliche Prozess-KPIs
  processAdherence?: number;    // 0..100
  tiltNoticed?: boolean;
  cooldownDone?: boolean;
  processDebrief?: string;
  hidePnLUntilDebrief?: boolean;

  // Partial Exits
  hasPartialExits?: boolean;
  partialExits?: PartialExit[];

  // Game
  gameComputed?: Grade;         // ⇦ kann S sein
  gameSelf?: Grade;             // ⇦ kann S sein
  gameItems?: string[];         // ⇦ IDs aus GameLibraryItem._id (keine "A:Label"-Keys mehr)
  gameCatalogScore?: number;    // Ø Punkte (0..3)
  gameCatalogGrade?: Grade;     // ⇦ kann S sein

  // Linking
  strategyId?: string;
  linkedGoalId?: string;

  // Texte
  tradeSummaryText?: string;
  embeddingSourceText?: string;

  // Lifecycle
  status?: "draft" | "final";
  completed?: boolean;
  missing?: string[];
  createdAt?: string;
  updatedAt?: string;

  // Media
  screenshotUrl?: string;

  // Notizen (kanonisch als String)
  notes?: string;
}

/* ---------------------------------- */
/* Vectorisierung                     */
/* ---------------------------------- */

export interface TradeEntryVectorReady extends TradeEntry {
  tradeSummaryText: string;
  reflectionNotes: string;
  ruleViolationsVector: string[];
  tagsVector: string[];
  setupVector: string;
  embeddingSourceText: string;
}

/* ---------------------------------- */
/* Gamification                       */
/* ---------------------------------- */

export interface GameItem {
  _id?: string;
  userId?: string | null;
  label: string;
  grade: Grade;               // ⇦ S-fähig
  score: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/* ---------------------------------- */
/* Weekly Stats / Leaderboard         */
/* ---------------------------------- */

export interface WeeklyStat {
  _id?: string;
  userId: string;
  week_start: string;
  best_pair: string | undefined;
  win_rate: number; // 0..1
  pct_change: number;
  top_pairs: { pair: string; win_rate: number }[];
  trades_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

/* ---------------------------------- */
/* Strategien & Fehlerklassifikation  */
/* ---------------------------------- */

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
