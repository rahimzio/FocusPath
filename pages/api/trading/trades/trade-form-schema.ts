// components/trading1/trades/trade-form-schema.ts
import { z } from "zod";

export const tradeFormSchema = z.object({
  date: z.string().min(1, "Datum ist erforderlich"),
  symbol: z.string().min(1, "Symbol ist erforderlich"),

  // optionaler Name des Setups
  setup: z.string().optional(),
  // Link zum Setup-Dokument
  setupId: z.string().optional(),

  entry: z.coerce.number().positive("Entry muss > 0 sein"),
  exit: z.coerce.number().positive("Exit muss > 0 sein"),
  stopLoss: z.coerce.number().positive("Stop Loss muss > 0 sein"),
  positionSize: z.coerce.number().positive("Positionsgröße muss > 0 sein"),

  result: z.enum(["win", "loss", "BE"]).default("win"),

  pnl: z.coerce.number(),
  rating: z.coerce.number().min(1).max(10),

  screenshotUrl: z
    .string()
    .url("Muss eine gültige URL sein")
    .optional()
    .or(z.literal("")),

  notes: z.string().optional(),
  // UI-Field: wird zu tags[] gesplittet
  tagsInput: z.string().optional(),

  gameGrade: z.enum(["A", "B", "C"]).optional(),
  thoughts: z.string().optional(),
});

export type TradeFormValues = z.infer<typeof tradeFormSchema>;
