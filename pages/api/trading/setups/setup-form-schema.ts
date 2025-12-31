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

export const setupFormSchema = z.object({
  // Basis
  market: z.string().min(1, "Markt ist erforderlich."),
  direction: z.enum(["long", "short"]),

  htfTf: z.enum(["D1", "H4", "H1"]),
  htfBias: z.enum(["bullish", "bearish", "range"]),
  entryTf: z.enum(["M15", "M5"]),

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
  plannedStop: z.string().optional(),
  plannedTarget: z.string().optional(),
  plannedRR: z.string().optional(),

  // Status & Auswertung
  status: statusEnum.default("open"),
  thoughtProcess: z.string().optional(),
  decision: decisionEnum.optional(),
  outcome: outcomeEnum.optional(),
  gameGrade: gameGradeEnum.optional(),
  reflection: z.string().optional(),

  // Entry-Checkliste – Map von checklistItemId → boolean
  checklistState: z
    .record(z.string(), z.boolean())
    .optional(),
});

export type SetupFormValues = z.infer<typeof setupFormSchema>;
