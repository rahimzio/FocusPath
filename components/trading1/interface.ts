// components/trading1/interface.ts

// ------------------------------------------------------
// Basis-Typen (Result, Session, GameGrade)
// ------------------------------------------------------

export type TradeResult = "win" | "loss" | "BE";
export type TradingSession = "asia" | "london" | "new_york" | "other";
export type GameGrade = "A" | "B" | "C";

// ------------------------------------------------------
// Setup / Playbook – Trading V2
// ------------------------------------------------------

export type SetupStatus =
  | "open"        // Setup ist aktiv, Markt noch im Spiel
  | "triggered"   // Level/Zonen wurden angetestet
  | "entered"     // Du bist im Trade (Trade existiert)
  | "missed"      // Setup lief, du warst nicht drin
  | "invalidated" // Marktstruktur hat Setup zerstört
  | "completed"; // Setup ist komplett durch (egal wie)

export type SetupDecision =
  | "entered"
  | "skipped_fear"
  | "skipped_discipline"
  | "missed_not_at_chart"
  | "missed_unclear"
  | "invalidated_before_entry";

export type SetupOutcome = "big_win" | "small_win" | "be" | "loss" | "unclear";

/**
 * Ein einzelner Checklistenpunkt, der vor dem Entry geprüft wird.
 * Template beschreibt, WAS geprüft werden soll.
 */
export interface SetupChecklistItem {
  id: string; // stabiler Key, z.B. "htf_align"
  label: string; // Kurztext im UI
  description?: string; // optionale Erklärung
  required?: boolean; // muss true sein für „sauberes“ A-Game
}

/**
 * Speichert, WAS der User bei diesem Setup tatsächlich angekreuzt hat.
 */
export interface SetupChecklistState {
  itemId: string;
  checked: boolean;
  checkedAt?: string; // ISO-String
}

// ------------------------------------------------------
// ✅ Planned Targets (TP1/2/3 + Runner)
// ------------------------------------------------------

export type PlannedTargetType = "tp1" | "tp2" | "tp3" | "runner";
export type PlannedLevelSide = "buyer" | "seller";

export interface PlannedTarget {
  id: string;
  type: PlannedTargetType; // tp1/tp2/tp3/runner
  price?: number; // optional (falls noch nicht sicher)
  label?: string; // frei: "Buyer Level", "Seller Level", "TP1", ...
  side?: PlannedLevelSide; // buyer/seller (optional)
}

// ------------------------------------------------------
// ✅ Thought Log Einträge (zeitlich getrennte Notes)
// ------------------------------------------------------

export interface ThoughtLogEntry {
  id: string;
  text: string;
  createdAt: string; // ISO
}

/**
 * TradingSetup modelliert eine Handels-Idee unabhängig vom Trade.
 */
export interface TradingSetup {
  _id?: string; // wird im API-Handler von ObjectId -> string gemappt
  userId: string;

  // ✅ NEU: muss später im Form gewählt werden
  tradeType: "daytrade" | "swingtrade";

  // Basis
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
  market: string; // z.B. "NAS100", "XAUUSD", "BTCUSD"
  direction: "long" | "short";

  // Optional: Chart-Screenshot
  chartImageUrl?: string;

  // Legacy Timeframe (alte Daten / einfache Auswahl)
  htfTf?: "D1" | "H4" | "H1";
  htfBias?: "bullish" | "bearish" | "range";
  entryTf?: "M15" | "M5";

  // Detaillierte Bias-Felder (Multi-TF)
  htfD1Bias?: "bullish" | "bearish" | "range";
  htfH4Bias?: "bullish" | "bearish" | "range";
  htfH1Bias?: "bullish" | "bearish" | "range";

  // Worauf wartest du?
  waitFor?: string;

  // Setup-Charakteristik
  setupLabel?: string; // freier Name, z.B. "4H Indication Long @ EQH"
  patternType: string; // Kategorie, z.B. "Indication + Continuation"
  keyLevels?: string[]; // wichtige Levels/Zonen (Text)
  structureNotes?: string; // Story: BOS, EQH/EQL, Liquidity etc.

  // Plan
  plannedEntryMin?: number;
  plannedEntryMax?: number;

  // ✅ SL bewusst optional (wird oft erst beim Entry klar)
  plannedStop?: number;

  // ✅ Legacy – kann später entfernt werden
  plannedTarget?: number;

  plannedRR?: number; // grobes Ziel-RR
  actualRR?: number; // ✅ NEU: tatsächlicher RR (später)

  // ✅ NEU: mehrere Targets (TP1/2/3 + Runner)
  plannedTargets?: PlannedTarget[];

  // Status & Verknüpfung
  status: SetupStatus;
  decision?: SetupDecision;
  outcome?: SetupOutcome;
  linkedTradeId?: string | null;
  resolvedAt?: string; // ISO, wenn Setup abgeschlossen

  // Entry-Checkliste
  entryChecklistTemplate?: SetupChecklistItem[];
  entryChecklistState?: SetupChecklistState[];
  checklistOverride?: boolean;

  // Game & Reflexion
  gameGrade?: GameGrade;

  // ✅ Legacy (optional beibehalten)
  thoughtProcess?: string;

  // ✅ NEU: echte Notes mit Timestamp
  thoughtLogs?: ThoughtLogEntry[];

  reflection?: string;
}

// ------------------------------------------------------
// Trade-Gruppen / Strategien (TradeZella-Style)
// ------------------------------------------------------

export interface TradeGroup {
  _id?: string;
  userId: string;
  name: string; // z.B. "NAS100 London Breakout"
  description?: string;
  color?: string; // später für Badges / Charts
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ------------------------------------------------------
// ICC-spezifische Typen
// ------------------------------------------------------

export type IccTrendHTF = "bullish" | "bearish" | "range";
export type IccTrendPart =
  | "indication"
  | "correction"
  | "continuation"
  | "reversal";

export type IccFourHStatus = "above" | "below" | "inside";
export type IccOneHStructure = "hh_hl" | "lh_ll" | "range";

export type IccTimeframeCombo =
  | "4h_1h"
  | "1h_15m"
  | "1h_5m"
  | "4h_daily"
  | "other";

export type IccPsychReason = "model" | "fomo" | "revenge" | "boredom" | "other";

// ⬇️ Playbook-Template IDs (müssen zu IccPlaybook.tsx passen)
export type IccPlaybookTemplateId = "icc_basic" | "icc_advanced";

// ⬇️ mentaler State-Tag
export type IccStateTag =
  | "focused"
  | "rushed"
  | "fearful"
  | "revengey"
  | "tired"
  | "tilt";

// ------------------------------------------------------
// TradeEntry – einzelner Trade (Journal + ICC)
// ------------------------------------------------------

export interface TradeEntry {
  _id?: string;
  type?: string; // z.B. "trading_trade_v1" (aus DB)
  userId: string;
  accountId?: string;

  // Basis
  date: string; // Format: YYYY-MM-DD
  symbol: string; // z.B. "NAS100"

  // Verknüpfung zu Setup & Group
  setup?: string; // alter freier Name (für Kompatibilität)
  setupLabel?: string; // Name der Setup-Idee (neu)
  setupId?: string; // Referenz auf TradingSetup (optional)
  groupId?: string; // Referenz auf TradeGroup
  groupName?: string; // redundanter Name für schnelle Anzeige

  // Trade-Parameter
  entry: number;
  exit: number;
  stopLoss: number;
  positionSize: number; // Lots oder Risiko in €
  result: TradeResult; // win / loss / BE
  pnl: number; // in Konto-Währung
  rMultiple?: number; // z.B. +2.5R, -1R

  rating: number; // 1–10 (subjektive Bewertung)
  screenshotUrl?: string;
  notes?: string;
  tags?: string[];

  // Session / Tages-Kontext
  session?: TradingSession; // asia / london / new_york / other
  dayOfWeek?: number; // 0–6
  accountName?: string; // falls mehrere Konten

  // Mental Game / Psychologie
  gameGrade?: GameGrade; // A/B/C-Game
  thoughts?: string; // Emotion, Zweifel, Fokus
  ruleBreak?: boolean; // Trade gegen Rules?
  ruleBreakNotes?: string; // Was wurde gebrochen?

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // ---------- ICC Core-Flags ----------
  isICC?: boolean;

  iccTrendHTF?: IccTrendHTF;
  iccTrendPart?: IccTrendPart;
  iccFourHStatus?: IccFourHStatus;
  iccOneHStructure?: IccOneHStructure;
  iccTimeframeCombo?: IccTimeframeCombo;

  // Checkliste ICC-Konfluences
  iccChecklistPriceAt4h?: boolean;
  iccChecklist1HFollowsTrend?: boolean;
  iccChecklistBosSwing?: boolean;
  iccChecklistTfCorrelation?: boolean;
  iccChecklistEntryImpulseZone?: boolean;
  iccChecklistSessionTime?: boolean;
  iccChecklistTargetOppositeSide?: boolean;

  // ---------- Risk Engine ----------
  accountType?: "funded" | "private";
  riskPercent?: number; // tatsächlich eingegangene %-Risiko
  plannedRR?: number; // geplanter RR (z. B. 3 = 3R)

  // ---------- Management / Status ----------
  managementStatus?: "planned" | "active" | "tp1" | "closed" | "stopped" | "be";
  managementMarkedHighsLows?: boolean;
  managementTookPartialsAtTp1?: boolean;
  managementClosedOnTrendChange?: boolean;
  managementHomeTradeUntilSessionEnd?: boolean;

  // ---------- ICC-Tags / Playbook ----------
  iccTags?: string[]; // separate Liste nur für ICC-Pattern
  iccPlaybookTemplateId?: IccPlaybookTemplateId; // welches Playbook-Template
  iccStateTag?: IccStateTag; // mentaler State beim Trade

  // ---------- Psych-Reason ----------
  psychReason?: IccPsychReason;
  psychComment?: string;
  violatedIccRules?: boolean;
  violatedRulesNotes?: string;

  // ---------- Replay / Screenshots ----------
  preScreenshotUrl?: string;
  postScreenshotUrl?: string;

  // ---------- Review ----------
  iccReviewNeeded?: boolean;
  iccReviewNotes?: string;
}
