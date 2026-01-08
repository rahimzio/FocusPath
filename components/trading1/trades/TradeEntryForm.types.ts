// components/trading1/trades/TradeEntryForm.types.ts
import type {
  GameGrade,
  TradingSession,
  TradeResult,
  IccTrendHTF,
  IccTrendPart,
  IccFourHStatus,
  IccOneHStructure,
  IccTimeframeCombo,
  IccPsychReason,
  IccPlaybookTemplateId,
  IccStateTag,
  TradeEntry,
} from "../interface";

export interface TradeEntryFormValues {
  date: string;
  symbol: string;
  setupLabel?: string;
  setupId?: string;

  groupId?: string;
  groupName?: string;

  entry: string;
  exit: string;
  stopLoss: string;
  positionSize: string;
  result: TradeResult;
  pnl: string;
  rating: string;

  screenshotUrl?: string;
  notes?: string;
  tags?: string;

  session?: TradingSession;
  accountName?: string;

  gameGrade?: GameGrade;
  thoughts?: string;
  ruleBreak?: boolean;
  ruleBreakNotes?: string;

  // -------- ICC Core --------
  isICC: boolean;
  iccTrendHTF: IccTrendHTF | "";
  iccTrendPart: IccTrendPart | "";
  iccFourHStatus: IccFourHStatus | "";
  iccOneHStructure: IccOneHStructure | "";
  iccTimeframeCombo: IccTimeframeCombo | "";

  iccChecklistPriceAt4h: boolean;
  iccChecklist1HFollowsTrend: boolean;
  iccChecklistBosSwing: boolean;
  iccChecklistTfCorrelation: boolean;
  iccChecklistEntryImpulseZone: boolean;
  iccChecklistSessionTime: boolean;
  iccChecklistTargetOppositeSide: boolean;

  iccPlaybookTemplateId?: IccPlaybookTemplateId | "";

  // -------- Risk Engine --------
  accountType?: "funded" | "private" | "";
  riskPercent: string;
  plannedRR: string;

  // -------- Management --------
  managementStatus?:
    | "planned"
    | "active"
    | "tp1"
    | "closed"
    | "stopped"
    | "be"
    | "";
  managementMarkedHighsLows: boolean;
  managementTookPartialsAtTp1: boolean;
  managementClosedOnTrendChange: boolean;
  managementHomeTradeUntilSessionEnd: boolean;

  // -------- ICC Tags / Psych / Replay --------
  iccTags?: string;
  psychReason?: IccPsychReason | "";
  psychComment?: string;
  violatedIccRules?: boolean;
  violatedRulesNotes?: string;

setupSelectedIds: z.array(z.string()).optional(),
setupGameGrade: z.enum(["S", "A", "B", "C"]).optional(),
setupAvgPoints: z.number().optional(),
  preScreenshotUrl?: string;
  postScreenshotUrl?: string;

  iccReviewNeeded?: boolean;
  iccReviewNotes?: string;// ⬇️ NEU: mentaler State (für Filter / Stats)
  iccStateTag?: IccStateTag | "";
}

export interface TradeEntryFormProps {
  userId: string;
  mode?: "create" | "edit";
  initialData?: TradeEntry;
  initialFormValues?: Partial<TradeEntryFormValues>;
  onSuccess?: (trade: TradeEntry) => void;
  className?: string;
}
