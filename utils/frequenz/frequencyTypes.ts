import { z } from "zod";

/** ---------- Frequency Current / Ideal ---------- */
export const FrequencyCurrentSchema = z.object({
  convictionNow: z.number().int().min(0).max(10),
  perceptionSelf: z.array(z.string()),
  emotionalState: z.array(z.string()),
  focusLeaks: z.array(z.string()),
  defaultReactions: z.array(z.string()),
  defaultExpectations: z.array(z.string()),
});

export type FrequencyCurrent = z.infer<typeof FrequencyCurrentSchema>;

export const FrequencyIdealSchema = z.object({
  convictionTarget: z.number().int().min(0).max(10),
  desiredIdentity: z.array(z.string()),
  desiredEmotions: z.array(z.string()),
  desiredFocus: z.array(z.string()),
  responsePattern: z.array(z.string()),
  expectationsIdeal: z.array(z.string()),
  microEvidencePlan: z.array(z.string()),
});

export type FrequencyIdeal = z.infer<typeof FrequencyIdealSchema>;

/** ---------- SetBase / SetModels Payloads ---------- */
export const SetBasePayloadSchema = z.object({
  userId: z.string().min(1),
  baseFrequency: z.number().int().min(0).max(10),
  selfView: z.array(z.string()),
  emotion: z.array(z.string()),
  focusLeaks: z.array(z.string()),
  defaultReactions: z.array(z.string()),
  expectations: z.array(z.string()),
});
export type SetBasePayload = z.infer<typeof SetBasePayloadSchema>;

export const SetModelsPayloadSchema = z.object({
  userId: z.string().min(1),
  current: FrequencyCurrentSchema.partial(), // wir speichern was vorhanden ist
  ideal:   FrequencyIdealSchema.partial(),
});
export type SetModelsPayload = z.infer<typeof SetModelsPayloadSchema>;

/** ---------- Tasks (DO / DON'T) ---------- */
export const TaskInputSchema = z.object({
  name: z.string().min(1),
  points: z.number().min(0).max(10).default(1),
  frequency: z.enum(["daily"]),       // aktuell nur daily
  timebased: z.boolean().default(false),
  category: z.string().default("Frequenz"),
  isFrequencyTask: z.boolean().default(true),
  isDont: z.boolean().optional().default(false),
});
export type TaskInput = z.infer<typeof TaskInputSchema>;

export const BulkCreateDailyPayloadSchema = z.object({
  userId: z.string().min(1),
  tasks: z.array(TaskInputSchema).min(1),
});
export type BulkCreateDailyPayload = z.infer<typeof BulkCreateDailyPayloadSchema>;

export function todayYMD(d = new Date()){
  return d.toISOString().slice(0,10)
}

export function prefToWeight(pref: 'gern'|'egal'|'nicht'){ // tweak as you like
  return pref === 'gern' ? 0.4 : pref === 'nicht' ? -0.4 : 0
}