// pages/api/trading/day/reflection.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";

type Grade = "A" | "B" | "C";

type Doc = {
  _id?: any;
  type: "day_reflection";
  userId: string;
  date: string; // YYYY-MM-DD
  dayAvgScore?: number;           // 0..3 (Ø Punkte aus Trades, falls vorhanden)
  dayGrade?: Grade;               // A/B/C (aus dayAvgScore oder manuellem Override)
  notes?: string;
  noTradeButGood?: boolean;
  missedSetups?: {
    count?: number;
    reasons?: string[];
    notes?: string;
  };
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  return s.slice(0, 10);
}
function isGrade(x: any): x is Grade {
  return x === "A" || x === "B" || x === "C";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection<Doc>("trading");

  // Indizes (idempotent); der unique-Index verhindert doppelte Tages-Dokumente je User
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, date: 1 }, { unique: true }),
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
    ]);
  } catch (e) {
    console.warn("[API day/reflection] index creation warning:", (e as any)?.message);
  }

  if (req.method === "GET") {
    const { userId, date } = req.query;

    console.log("[API day/reflection][GET] query =", req.query);

    if (typeof userId !== "string" || !userId) {
      console.log("[API day/reflection][GET] 400 missing userId");
      return res.status(400).json({ error: "userId required" });
    }
    if (typeof date !== "string" || !date) {
      console.log("[API day/reflection][GET] 400 missing date");
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const day = toDateOnly(date);
    try {
      const doc = await col.findOne({
        type: "day_reflection",
        userId,
        date: day,
        deleted: { $ne: true },
      });

      console.log("[API day/reflection][GET] found =", !!doc, "id =", doc?._id, "durationMs =", Date.now() - startedAt);
      return res.status(200).json({ reflection: doc ?? null });
    } catch (e: any) {
      console.error("[API day/reflection][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    console.log("[API day/reflection][POST] body =", body);

    const userId = String(body.userId || "").trim();
    const day = toDateOnly(String(body.date || ""));
    if (!userId) {
      console.log("[API day/reflection][POST] 400 missing userId");
      return res.status(400).json({ error: "userId required" });
    }
    if (!day) {
      console.log("[API day/reflection][POST] 400 missing date");
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const nowIso = new Date().toISOString();

    const payload: Partial<Doc> = {
      type: "day_reflection",
      userId,
      date: day,
      dayAvgScore: Number.isFinite(Number(body.dayAvgScore)) ? Number(body.dayAvgScore) : undefined,
      dayGrade: isGrade(body.dayGrade) ? body.dayGrade : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      noTradeButGood: !!body.noTradeButGood,
      missedSetups: body.missedSetups
        ? {
            count: Number.isFinite(Number(body.missedSetups.count)) ? Number(body.missedSetups.count) : undefined,
            reasons: Array.isArray(body.missedSetups.reasons) ? body.missedSetups.reasons.map(String) : undefined,
            notes: typeof body.missedSetups.notes === "string" ? body.missedSetups.notes : undefined,
          }
        : undefined,
      updatedAt: nowIso,
      deleted: false,
    };

    try {
      const result = await col.updateOne(
        { type: "day_reflection", userId, date: day },
        {
          $set: payload,
          $setOnInsert: { createdAt: nowIso },
        },
        { upsert: true }
      );

      // Für’s Frontend ist es oft praktisch, das aktuelle Doc direkt zurückzubekommen:
      const saved = await col.findOne({ type: "day_reflection", userId, date: day });

      console.log("[API day/reflection][POST] upsert result =", {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId,
        durationMs: Date.now() - startedAt,
      });

      return res.status(200).json({ ok: true, upsertedId: result.upsertedId ?? null, reflection: saved ?? null });
    } catch (e: any) {
      // unique Index könnte E11000 werfen – wir loggen & antworten sauber
      console.error("[API day/reflection][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  console.log("[API day/reflection] 405 method =", req.method);
  return res.status(405).json({ error: "Method not allowed" });
}