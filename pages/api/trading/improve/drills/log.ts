// pages/api/trading/improve/drills/log.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type DrillDoneDoc = {
  _id?: any;
  type: "improve_drill_done_v1";
  userId: string;

  drillId: string;       // ObjectId als string (drill _id)
  date: string;          // YYYY-MM-DD (local day key)

  scope?: "trade" | "setup" | "reflection" | "all"; // optional snapshot
  factorIds?: string[];  // optional snapshot for fast stats

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;     // soft delete (undo)
  deletedAt?: string;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  return String(s).slice(0, 10);
}

function toIsoNow() {
  return new Date().toISOString();
}

function uniqStrings(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out.length ? out : undefined;
}

function parseObjectId(id: any): ObjectId | null {
  try {
    const s = String(id || "").trim();
    if (!s) return null;
    return new ObjectId(s);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection<DrillDoneDoc>("trading");

  // Indizes (idempotent)
  try {
    await Promise.all([
      // ✅ 핵심: one done per user+date (NOT per drill)
      col.createIndex({ type: 1, userId: 1, date: 1 }, { unique: true }),

      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, date: -1 }),
      col.createIndex({ type: 1, userId: 1, drillId: 1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
    ]);
  } catch (e: any) {
    console.warn("[API improve/drills/log] index warn:", e?.message);
  }

  /**
   * GET
   * - Single day: /api/trading/improve/drills/log?userId=...&date=YYYY-MM-DD
   * - Range:      /api/trading/improve/drills/log?userId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  if (req.method === "GET") {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) return res.status(400).json({ error: "userId required" });

    const date = typeof req.query.date === "string" ? toDateOnly(req.query.date) : "";
    const from = typeof req.query.from === "string" ? toDateOnly(req.query.from) : "";
    const to = typeof req.query.to === "string" ? toDateOnly(req.query.to) : "";

    const filter: any = {
      type: "improve_drill_done_v1",
      userId,
      deleted: { $ne: true },
    };

    if (date) {
      filter.date = date;
    } else if (from && to) {
      filter.date = { $gte: from, $lte: to };
    } else {
      return res.status(400).json({ error: "date OR (from+to) required" });
    }

    try {
      const items = await col.find(filter).sort({ date: -1, createdAt: -1 }).toArray();

      return res.status(200).json({
        items,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API improve/drills/log][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  /**
   * POST  -> mark done (1 per day)
   * body: { userId, drillId, date?, scope?, factorIds? }
   * - date default: today
   * - behavior: upsert for (userId+date) => replaces drillId if already exists
   */
  if (req.method === "POST") {
    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();
    const drillId = String(body.drillId || "").trim();
    const day = toDateOnly(String(body.date || "")) || toDateOnly(new Date().toISOString());

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!drillId) return res.status(400).json({ error: "drillId required" });
    if (!day) return res.status(400).json({ error: "date required" });

    // optional sanity: drillId looks like ObjectId
    if (!parseObjectId(drillId)) {
      console.warn("[API improve/drills/log][POST] drillId not ObjectId:", drillId);
    }

    const nowIso = toIsoNow();

    const scope =
      body.scope === "trade" || body.scope === "setup" || body.scope === "reflection" || body.scope === "all"
        ? body.scope
        : undefined;

    const factorIds = uniqStrings(body.factorIds);

    const payload: Partial<DrillDoneDoc> = {
      type: "improve_drill_done_v1",
      userId,
      drillId,
      date: day,
      scope,
      factorIds,
      updatedAt: nowIso,
      deleted: false,
      deletedAt: undefined,
    };

    try {
      // ✅ upsert by (userId+date): ensures only one done per day
      await col.updateOne(
        { type: "improve_drill_done_v1", userId, date: day },
        { $set: payload, $setOnInsert: { createdAt: nowIso } },
        { upsert: true }
      );

      const saved = await col.findOne({ type: "improve_drill_done_v1", userId, date: day });

      return res.status(200).json({
        ok: true,
        done: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      // unique constraint race: if two clicks at same time
      if (String(e?.message || "").includes("E11000")) {
        const existing = await col.findOne({ type: "improve_drill_done_v1", userId, date: day });
        return res.status(200).json({
          ok: true,
          done: existing ?? null,
          meta: { durationMs: Date.now() - startedAt, note: "deduped" },
        });
      }

      console.error("[API improve/drills/log][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  /**
   * DELETE -> undo done (soft delete)
   * query: /api/trading/improve/drills/log?userId=...&date=YYYY-MM-DD
   */
  if (req.method === "DELETE") {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    const day = typeof req.query.date === "string" ? toDateOnly(req.query.date) : "";

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!day) return res.status(400).json({ error: "date required" });

    const nowIso = toIsoNow();

    try {
      const existing = await col.findOne({
        type: "improve_drill_done_v1",
        userId,
        date: day,
        deleted: { $ne: true },
      });

      if (!existing) {
        return res.status(200).json({ ok: true, removed: false, meta: { durationMs: Date.now() - startedAt } });
      }

      await col.updateOne(
        { type: "improve_drill_done_v1", userId, date: day },
        { $set: { deleted: true, deletedAt: nowIso, updatedAt: nowIso } }
      );

      return res.status(200).json({
        ok: true,
        removed: true,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API improve/drills/log][DELETE] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
