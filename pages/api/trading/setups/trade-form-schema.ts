// components/trading/trades/trade-form-schema.ts
import { z } from "zod";

export const tradeFormSchema = z.object({
  date: z.string().min(1, "Datum ist erforderlich"), // YYYY-MM-DD
  symbol: z.string().min(1, "Symbol ist erforderlich"),
  direction: z.enum(["long", "short"], {
    message: "Richtung muss long oder short sein",
  }),

  entry: z.coerce.number().positive("Entry muss > 0 sein"),
  stopLoss: z.coerce.number().positive("Stop muss > 0 sein"),
  takeProfit: z.coerce.number().optional(),
  exit: z.coerce.number().optional(),
  positionSize: z.coerce.number().positive("Positionsgröße muss > 0 sein"),

  result: z.enum(["win", "loss", "BE"]).optional(),
  pnl: z.coerce.number().optional(),
  rating: z.coerce.number().min(1).max(10).optional(),

  displayName: z.string().optional(),
  setupName: z.string().optional(),
  groupName: z.string().optional(),

  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),

  setupId: z.string().optional(),
});

export type TradeFormValues = z.infer<typeof tradeFormSchema>;
