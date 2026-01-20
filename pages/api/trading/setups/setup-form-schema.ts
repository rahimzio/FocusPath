// components/trading1/setup/setup-form-schema.ts
import { z } from "zod";

// Status/Decision/Outcome/GameGrade hier direkt als Enums definieren,
// damit das Schema unabhängig vom Interface ist.
const statusEnum = z.enum([
  "open",
  "triggered",
  "entered",
  "missed",
  "invalidated",
  "completed",
]);

const decisionEnum = z.enum([
  "entered",
  "skipped_fear",
  "skipped_discipline",
  "missed_not_at_chart",
  "missed_unclear",
  "invalidated_before_entry",
]);

const outcomeEnum = z.enum([
  "big_win",
  "small_win",
  "be",
  "loss",
  "unclear",
]);

const gameGradeEnum = z.enum(["A", "B", "C"]);

// ✅ NEU: Schema für einen Entry-Checklist-Item (User-defined)
export const entryChecklistItemSchema = z.object({
  id: z.string().min(1, "Checklist item needs an id"),
  label: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  required: z.boolean().optional().default(false),
});

// ✅ NEU: Planned Targets (TP1/2/3 + Runner) im FORM als Strings
export const plannedTargetSchema = z.object({
  id: z.string().min(1, "Target needs an id"),
  type: z.enum(["tp1", "tp2", "tp3", "runner"]),
  // als STRING, weil Input-Felder Strings sind; beim Submit -> Number()
  price: z.string().optional().default(""),
  // frei wählbar: "Buyer Level", "Seller Level", "TP1", ...
  label: z.string().optional().default(""),
  // buyer/seller optional
  side: z.enum(["buyer", "seller"]).optional(),
});

export const setupFormSchema = z.object({
  // ✅ Pflicht: Daytrade oder Swingtrade
  tradeType: z.enum(["daytrade", "swingtrade"]).default("swingtrade"),

  // Basis
  market: z.string().min(1, "Markt ist erforderlich."),
  direction: z.enum(["long", "short"]),

  htfTf: z.enum(["D1", "H4", "H1"]),
  htfBias: z.enum(["bullish", "bearish", "range"]),
  entryTf: z.enum(["H1", "M30", "M15", "M5"]),

  // Chart (URL – aktuell nur Textfeld)
  chartImageUrl: z
    .string()
    .url("Muss eine gültige URL sein.")
    .or(z.literal(""))
    .optional(),

  // 🔹 Multi-Timeframe-Bias
  htfD1Bias: z.enum(["bullish", "bearish", "range"]).optional(),
  htfH4Bias: z.enum(["bullish", "bearish", "range"]).optional(),
  htfH1Bias: z.enum(["bullish", "bearish", "range"]).optional(),

  // 🔹 Worauf wartest du?
  waitFor: z.string().optional(),

  // Setup & Struktur
  setupLabel: z.string().optional(),
  patternType: z.string().min(1, "Setup-Typ ist erforderlich."),
  keyLevels: z.array(z.string()).optional(),
  structureNotes: z.string().optional(),

  // Plan – im Formular als STRING, beim Submit parsen wir zu number
  plannedEntryMin: z.string().optional(),
  plannedEntryMax: z.string().optional(),

  // SL absichtlich optional
  plannedStop: z.string().optional(),

  // ✅ Legacy (optional)
  plannedTarget: z.string().optional(),

  plannedRR: z.string().optional(),

  // ✅ NEU: tatsächlicher RR (optional)
  actualRR: z.string().optional(),

  // ✅ NEU: Multi-Targets (TP1/2/3 + Runner)
  plannedTargets: z.array(plannedTargetSchema).optional().default([]),

  // Status & Auswertung
  status: statusEnum.default("open"),
  thoughtProcess: z.string().optional(), // legacy
  decision: decisionEnum.optional(),
  outcome: outcomeEnum.optional(),
  gameGrade: gameGradeEnum.optional(),
  reflection: z.string().optional(),

  // ✅ User-defined Entry-Checkliste (Template)
  // Standard: [] (keine Default-Liste mehr!)
  entryChecklistTemplate: z.array(entryChecklistItemSchema).optional().default([]),

  // Entry-Checkliste – Map von checklistItemId → boolean (Preview)
  checklistState: z.record(z.string(), z.boolean()).optional().default({}),
});

export type SetupFormValues = z.infer<typeof setupFormSchema>;
