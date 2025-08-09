// pages/api/conviction/today.ts
import type { NextApiRequest, NextApiResponse } from "next";
import mongoose, { Schema, model, models } from "mongoose";
import { computeConvictionScore, ConvictionInputs } from "../conviction";

// --- DB plumbing (simple, no external deps) ---
const MONGODB_URI = process.env.MONGODB_URI!;
let cached = (global as any)._conv_mongoose as Promise<typeof mongoose> | undefined;

function dbConnect() {
  if (!MONGODB_URI) {
    console.warn("[conviction] No MONGODB_URI provided — API will still work in memory, but won’t persist.");
    return Promise.resolve(mongoose);
  }
  if (!cached) {
    cached = mongoose.connect(MONGODB_URI);
    (global as any)._conv_mongoose = cached;
  }
  return cached;
}

// --- types ---
type ConvictionDoc = {
  userId: string;
  date: string; // YYYY-MM-DD
  inputs: ConvictionInputs;
  ema: number;
  createdAt?: Date;
  updatedAt?: Date;
};

// --- model (strongly typed) ---
const ConvictionSchema = new Schema<ConvictionDoc>(
  {
    userId: { type: String, index: true, required: true },
    date: { type: String, index: true, required: true }, // YYYY-MM-DD
    inputs: { type: Schema.Types.Mixed, required: true },
    ema: { type: Number, required: true },
  },
  { timestamps: true }
);

ConvictionSchema.index({ userId: 1, date: 1 }, { unique: true });

// Force a single, precise type (avoid union from models[...] || model(...))
const ConvictionModel: mongoose.Model<ConvictionDoc> =
  (models.ConvictionDaily as mongoose.Model<ConvictionDoc>) ??
  model<ConvictionDoc>("ConvictionDaily", ConvictionSchema);

// --- helpers ---
function isoDateUTC(d = new Date()) {
  // YYYY-MM-DD in UTC
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function yesterday(dateISO: string) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

async function getPrevEma(userId: string, dateISO: string): Promise<number | null> {
  // Use projection + generic lean for crisp typing and less data
  const prev = await ConvictionModel.findOne({ userId, date: yesterday(dateISO) })
    .select<{ ema: number }>("ema")
    .lean<{ ema: number }>();
  return prev?.ema ?? null;
}

// --- handler ---
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  // Params
  const userId = String(req.query.userId || "");
  const date = (req.query.date as string) || isoDateUTC();

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  await dbConnect().catch(() => {
    /* ignore for in-memory run */
  });

  try {
    if (method === "GET") {
      // Try to find today's doc
      const todayDoc = await ConvictionModel.findOne({ userId, date }).lean<ConvictionDoc>();

      if (todayDoc) {
        // Ensure client receives inputs + prevEma (for transparency)
        const prevEma = await getPrevEma(userId, date);
        const inputsWithPrev: ConvictionInputs = {
          ...todayDoc.inputs,
          prevEma: prevEma ?? todayDoc.inputs.prevEma,
        };
        return res.status(200).json({
          date,
          inputs: inputsWithPrev,
          ema: todayDoc.ema,
        });
      }

      // If none, seed with defaults + prevEma from yesterday (but don't create on GET)
      const prevEma = await getPrevEma(userId, date);

      const inputs: ConvictionInputs = {
        date,
        userId,
        selfPromisesKept: 0,
        selfPromisesBroken: 0,
        evidenceAdds: 0,
        antiEvidenceAdds: 0, // ⚠️ things you didn't want to do (violations)
        focusMinutes: 0,
        distractionMinutes: 0,
        moodLabel: undefined,
        prevEma: prevEma ?? undefined,
      };

      // Don’t create a doc on GET — just hand inputs back so the card can show EMA
      return res.status(200).json({ date, inputs, ema: computeConvictionScore(inputs).ema });
    }

    if (method === "POST") {
      // Upsert today's inputs; compute EMA using yesterday; store & return
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as Partial<ConvictionInputs>;
      const prevEma = await getPrevEma(userId, date);

      const inputs: ConvictionInputs = {
        date,
        userId,
        selfPromisesKept: body.selfPromisesKept ?? 0,
        selfPromisesBroken: body.selfPromisesBroken ?? 0,
        evidenceAdds: body.evidenceAdds ?? 0,
        antiEvidenceAdds: body.antiEvidenceAdds ?? 0,
        focusMinutes: body.focusMinutes ?? 0,
        distractionMinutes: body.distractionMinutes ?? 0,
        moodLabel: body.moodLabel,
        prevEma: prevEma ?? body.prevEma, // server preference
      };

      const scored = computeConvictionScore(inputs);

      const saved = await ConvictionModel.findOneAndUpdate(
        { userId, date },
        { userId, date, inputs, ema: scored.ema },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean<ConvictionDoc>();

      return res.status(200).json({ date, inputs, ema: saved!.ema, breakdown: scored });
    }

    if (method === "PATCH") {
      // Lightweight counters update for quick events:
      // body: { kind: "evidence" | "violation" | "kept" | "broken", delta?: number }
      const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as {
        kind: "evidence" | "violation" | "kept" | "broken";
        delta?: number;
      };

      // Need a hydrated doc here (no .lean) because we call .save()
      let doc = await ConvictionModel.findOne({ userId, date });

      if (!doc) {
        // create a minimal doc first
        const seed: ConvictionInputs = {
          date,
          userId,
          selfPromisesKept: 0,
          selfPromisesBroken: 0,
          evidenceAdds: 0,
          antiEvidenceAdds: 0,
          focusMinutes: 0,
          distractionMinutes: 0,
          prevEma: (await getPrevEma(userId, date)) ?? undefined,
        };
        await ConvictionModel.create({
          userId,
          date,
          inputs: seed,
          ema: computeConvictionScore(seed).ema,
        });
        doc = await ConvictionModel.findOne({ userId, date }); // reload hydrated
      }

      if (!doc) return res.status(500).json({ error: "Failed to seed doc" });

      const delta = Math.max(1, Math.floor(body.delta ?? 1));
      switch (body.kind) {
        case "evidence":
          (doc.inputs as any).evidenceAdds = ((doc.inputs as any).evidenceAdds || 0) + delta;
          break;
        case "violation":
          (doc.inputs as any).antiEvidenceAdds = ((doc.inputs as any).antiEvidenceAdds || 0) + delta; // ⬅️ negative
          break;
        case "kept":
          (doc.inputs as any).selfPromisesKept = ((doc.inputs as any).selfPromisesKept || 0) + delta;
          break;
        case "broken":
          (doc.inputs as any).selfPromisesBroken = ((doc.inputs as any).selfPromisesBroken || 0) + delta;
          break;
      }

      // Recompute EMA using yesterday's EMA as baseline
      (doc.inputs as any).prevEma = (await getPrevEma(userId, date)) ?? (doc.inputs as any).prevEma;
      const scored = computeConvictionScore(doc.inputs as ConvictionInputs);
      doc.ema = scored.ema;
      await doc.save();

      return res.status(200).json({ date, inputs: doc.inputs, ema: doc.ema, breakdown: scored });
    }

    res.setHeader("Allow", "GET,POST,PATCH");
    return res.status(405).json({ error: `Method ${method} Not Allowed` });
  } catch (err: any) {
    console.error("[conviction] API error:", err);
    return res.status(500).json({ error: "Internal error", detail: err?.message });
  }
}
