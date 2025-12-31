// components/trading/interface.ts

// ------------------------------------------------------
// Trading V2 – Game, Setup & Entry-Checkliste
// ------------------------------------------------------

export type GameGrade = "A" | "B" | "C";

export type SetupStatus =
  | "open"        // Setup ist aktiv, Markt noch im Spiel
  | "triggered"   // Level/Zonen wurden angetestet
  | "entered"     // Du bist im Trade (Trade existiert)
  | "missed"      // Setup lief, du warst nicht drin
  | "invalidated" // Marktstruktur hat Setup zerstört
  | "completed";  // Setup ist komplett durch (egal wie)

export type SetupDecision =
  | "entered"
  | "skipped_fear"
  | "skipped_discipline"
  | "missed_not_at_chart"
  | "missed_unclear"
  | "invalidated_before_entry";

export type SetupOutcome =
  | "big_win"
  | "small_win"
  | "be"
  | "loss"
  | "unclear";

/**
 * Ein einzelner Checklistenpunkt, der vor dem Entry geprüft wird.
 * Template beschreibt, WAS geprüft werden soll.
 */
export interface SetupChecklistItem {
  id: string;           // stabiler Key, z.B. "htf_align"
  label: string;        // Kurztext im UI
  description?: string; // optionale Erklärung
  required?: boolean;   // muss true sein für „sauberes“ A-Game
}

/**
 * Speichert, WAS der User bei diesem Setup tatsächlich angekreuzt hat.
 */
export interface SetupChecklistState {
  itemId: string;
  checked: boolean;
  checkedAt?: string;   // ISO-String
}

/**
 * TradingSetup modelliert eine Handels-Idee unabhängig vom tatsächlichen Trade.
 * Es ist das Herz der V2-Logik (Planung, Entscheidung, Game-Bewertung).
 */
export interface TradingSetup {
  _id?: string;        // wird im API-Handler von ObjectId -> string gemappt
  userId: string;

  // Basis
  createdAt?: string;  // ISO
  updatedAt?: string;  // ISO (für Edit-Tracking)
  market: string;      // z.B. "NAS100", "XAUUSD", "BTCUSD"
  direction: "long" | "short";

  // 🔹 NEU: Chart-Screenshot (Setup-Bild)
  chartImageUrl?: string;

  // Timeframe-Kontext (Legacy – kannst du später ablösen)
  htfTf?: "D1" | "H4" | "H1";
  htfBias?: "bullish" | "bearish" | "range";
  entryTf?: "M15" | "M5";

  // 🔹 Zukünftige, detaillierte Bias-Felder
  htfD1Bias?: "bullish" | "bearish" | "range";
  htfH4Bias?: "bullish" | "bearish" | "range";
  htfH1Bias?: "bullish" | "bearish" | "range";

  // Setup-Charakteristik
  setupLabel?: string;     // freier Name, z.B. "4H Indication Long @ EQH"
  patternType: string;     // Kategorie, z.B. "Indication + Continuation"
  keyLevels?: string[];    // wichtige Levels/Zonen (Text)
  structureNotes?: string; // Story: BOS, EQH/EQL, Liquidity etc.

  // Plan
  plannedEntryMin?: number;
  plannedEntryMax?: number;
  plannedStop?: number;
  plannedTarget?: number;
  plannedRR?: number;      // grobes Ziel-RR

  // Status & Verknüpfung
  status: SetupStatus;
  decision?: SetupDecision;
  outcome?: SetupOutcome;
  linkedTradeId?: string | null;
  resolvedAt?: string;     // ISO, wenn Setup abgeschlossen

  // Entry-Checkliste
  entryChecklistTemplate?: SetupChecklistItem[]; // Definition der Punkte
  entryChecklistState?: SetupChecklistState[];   // tatsächliches Abhaken
  checklistOverride?: boolean; // true, wenn Trade trotz offener Pflicht-Items genommen wurde

  // Game & Reflexion
  gameGrade?: GameGrade;   // A/B/C-Game für dieses Setup
  thoughtProcess?: string; // laufender Gedanken-Log über Tage
  reflection?: string;     // finale Auswertung nach Abschluss
}

/**
 * Trade-Interface (V2-ready) – Verknüpfung mit Setup + Gruppen + Source.
 */
export interface TradeEntry {
  _id?: string;
  userId: string;

  // Basis
  date: string; // Format: YYYY-MM-DD
  symbol: string;
  direction: "long" | "short";

  // Order / Pricing
  entry: number;
  exit: number;
  stopLoss: number;
  positionSize: number;
  takeProfit?: number;

  // Ergebnis
  result: "win" | "loss" | "BE";
  pnl: number;           // Geldbetrag
  pnlR?: number;         // R-Wert optional
  rating: number;        // 1–10

  // Namen / Struktur
  displayName?: string;  // eigener Name für den Trade (umbenennen)
  setup?: string;        // freier Setup-Name (Text)
  setupId?: string;      // Referenz auf TradingSetup
  groupName?: string;    // z.B. "London Reversal" (Gruppe/Cluster)

  // Meta
  screenshotUrl?: string;
  notes?: string;
  tags?: string[];

  // Quelle & Status (für spätere Auto-Imports)
  accountId?: string; // Trading-Konto
  source?: "manual" | "import_mt5" | "import_csv";
  status?: "inbox" | "journaled";

  // Game / Psychologie
  gameGrade?: GameGrade; // A/B/C-Game
  thoughts?: string;     // Kurzgedanken zum Entry (Emotion, Zweifel etc.)
}
// components/trading1/interface.ts

// ------------------------------------------------------
// Trading V2 – Game, Setup & Entry-Checkliste
// ------------------------------------------------------

export type GameGrade = "A" | "B" | "C";

export type SetupStatus =
  | "open"        // Setup ist aktiv, Markt noch im Spiel
  | "triggered"   // Level/Zonen wurden angetestet
  | "entered"     // Du bist im Trade (Trade existiert)
  | "missed"      // Setup lief, du warst nicht drin
  | "invalidated" // Marktstruktur hat Setup zerstört
  | "completed";  // Setup ist komplett durch (egal wie)

export type SetupDecision =
  | "entered"
  | "skipped_fear"
  | "skipped_discipline"
  | "missed_not_at_chart"
  | "missed_unclear"
  | "invalidated_before_entry";

export type SetupOutcome =
  | "big_win"
  | "small_win"
  | "be"
  | "loss"
  | "unclear";

export interface SetupChecklistItem {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface SetupChecklistState {
  itemId: string;
  checked: boolean;
  checkedAt?: string;
}

/**
 * TradingSetup modelliert eine Handels-Idee unabhängig vom tatsächlichen Trade.
 */
export interface TradingSetup {
  _id?: string;           // im API-Handler von ObjectId -> string gemappt
  userId: string;

  // Basis
  createdAt?: string;
  updatedAt?: string;
  market: string;         // z.B. NAS100, XAUUSD, BTCUSD
  direction: "long" | "short";

  // Chart
  chartImageUrl?: string;

  // Legacy-TF-Infos
  htfTf?: "D1" | "H4" | "H1";
  htfBias?: "bullish" | "bearish" | "range";
  entryTf?: "M15" | "M5";

  // Neue, detaillierte Bias-Felder
  htfD1Bias?: "bullish" | "bearish" | "range";
  htfH4Bias?: "bullish" | "bearish" | "range";
  htfH1Bias?: "bullish" | "bearish" | "range";

  // Worauf wartest du?
  waitFor?: string;

  // Setup-Charakteristik
  setupLabel?: string;
  patternType: string;
  keyLevels?: string[];
  structureNotes?: string;

  // Plan
  plannedEntryMin?: number;
  plannedEntryMax?: number;
  plannedStop?: number;
  plannedTarget?: number;
  plannedRR?: number;

  // Status & Verknüpfung
  status: SetupStatus;
  decision?: SetupDecision;
  outcome?: SetupOutcome;
  linkedTradeId?: string | null;
  resolvedAt?: string;

  // Entry-Checkliste
  entryChecklistTemplate?: SetupChecklistItem[];
  entryChecklistState?: SetupChecklistState[];
  checklistOverride?: boolean;

  // Game & Reflexion
  gameGrade?: GameGrade;
  thoughtProcess?: string;
  reflection?: string;
}

/**
 * Trade-Interface (V2-ready)
 */
export interface TradeEntry {
  _id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  symbol: string;
  setup?: string;
  entry: number;
  exit: number;
  stopLoss: number;
  positionSize: number;
  result: "win" | "loss" | "BE";
  pnl: number;
  rating: number;
  screenshotUrl?: string;
  notes?: string;
  tags?: string[];

  setupId?: string;       // Verknüpfung zu Setup
  gameGrade?: GameGrade;
  thoughts?: string;
}
