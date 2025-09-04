// pages/api/trading/game-catalog.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, Db, ObjectId } from "mongodb";

/**
 * Collection: game_catalog
 * Doc-Shape:
 * {
 *   _id: ObjectId,
 *   userId?: string | null,     // null = global/preset
 *   label: string,              // z.B. "Plan befolgt"
 *   grade: "A" | "B" | "C",     // Kategorie
 *   score: number,              // Punktwert, z.B. 3
 *   active: boolean,            // sichtbar/verwendbar
 *   createdAt: string,          // ISO
 *   updatedAt: string           // ISO
 * }
 *
 * Endpoints:
 * GET  /api/trading/game-catalog?userId=...&includeGlobal=true&seed=true
 * POST /api/trading/game-catalog           body: { userId?, label, grade, score?, active? }
 * PUT  /api/trading/game-catalog?id=...    body: { label?, grade?, score?, active? }
 * DELETE /api/trading/game-catalog?id=...
 */

type Grade = "A" | "B" | "C";
type GameItem = {
  _id?: string;
  userId?: string | null;
  label: string;
  grade: Grade;
  score: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

let _client: MongoClient | null = null;
let _db: Db | null = null;

async function getDb(): Promise<Db> {
  if (_db) return _db;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI fehlt.");
  _client = await MongoClient.connect(uri);
  const dbName = process.env.MONGODB_DB || (new URL(uri).pathname.replace("/", "") || "trading");
  _db = _client.db(dbName);
  return _db;
}

function nowIso() {
  return new Date().toISOString();
}
function toId(id?: string) {
  if (!id) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}
function parseBool(v: any, def = false) {
  if (v === true || v === "true" || v === 1 || v === "1") return true;
  if (v === false || v === "false" || v === 0 || v === "0") return false;
  return def;
}
function validateGrade(g: any): g is Grade {
  return g === "A" || g === "B" || g === "C";
}

// Punkte-Fallback pro Grade
const DEFAULT_POINTS: Record<Grade, number> = { A: 3, B: 2, C: 1 };

// --------- Defaults (nur wenn leer + seed=true) ----------
const DEFAULT_PRESETS: Omit<GameItem, "_id" | "createdAt" | "updatedAt">[] = [
  { userId: null, label: "Plan befolgt", grade: "A", score: 3, active: true },
  { userId: null, label: "RR eingehalten", grade: "A", score: 3, active: true },
  { userId: null, label: "SL respektiert", grade: "A", score: 3, active: true },
  { userId: null, label: "Gute Location", grade: "B", score: 2, active: true },
  { userId: null, label: "Saubere Entry-Quali", grade: "B", score: 2, active: true },
  { userId: null, label: "News beachtet", grade: "B", score: 2, active: true },
  { userId: null, label: "Hastig/Unsicher", grade: "C", score: 1, active: true },
  { userId: null, label: "Overtrading", grade: "C", score: 1, active: true },
  { userId: null, label: "FOMO", grade: "C", score: 1, active: true },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("trading");

    // nützlicher Index (idempotent)
    try {
      await col.createIndex({ userId: 1, label: 1 });
    } catch {/* noop */ }

    // -------- GET
    if (req.method === "GET") {
      const { userId, includeGlobal, seed } = req.query as Record<string, string | undefined>;

      // Optional seeden (nur globale Presets, wenn noch keine vorhanden)
      if (seed === "true") {
        const count = await col.countDocuments({ userId: null });
        if (count === 0) {
          const docs = DEFAULT_PRESETS.map((p) => ({
            ...p,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          }));
          await col.insertMany(docs as any);
        }
      }

      const useGlobal = parseBool(includeGlobal ?? "true", true);
      const match: any = { active: { $ne: false } };
      if (userId && useGlobal) {
        match.$or = [{ userId }, { userId: null }, { userId: { $exists: false } }];
      } else if (userId && !useGlobal) {
        match.userId = userId;
      } else {
        // nur globale, falls kein userId übergeben
        match.$or = [{ userId: null }, { userId: { $exists: false } }];
      }

      const items = await col
        .find(match)
        .sort({ grade: 1, label: 1 }) // A → B → C, dann Label
        .toArray();

      // _id stringify + Score-Fallback je Grade
      const out = items.map((d) => ({
        ...d,
        _id: String((d as any)._id),
        score:
          Number.isFinite(Number((d as any).score))
            ? Number((d as any).score)
            : DEFAULT_POINTS[(d as any).grade as Grade],
      }));

      return res.status(200).json({ items: out });
    }

    // -------- POST (create)
    if (req.method === "POST") {
      const { userId, label, grade, score, active } = req.body ?? {};
      if (!label || !validateGrade(grade)) {
        return res
          .status(400)
          .json({ error: "label und grade (A/B/C) sind erforderlich." });
      }

      const sc = Number(score);
      const finalScore = Number.isFinite(sc) ? Math.max(0, Math.round(sc)) : DEFAULT_POINTS[grade];

      const item: GameItem = {
        userId: userId ?? null,
        label: String(label).trim(),
        grade,
        score: finalScore,
        active: parseBool(active, true),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      const r = await col.insertOne(item as any);
      return res.status(201).json({ item: { ...item, _id: String(r.insertedId) } });
    }

    // -------- PUT (update)
    if (req.method === "PUT") {
      const { id } = req.query as { id?: string };
      const _id = toId(id);
      if (!_id) return res.status(400).json({ error: "Ungültige id." });

      const patch: Partial<GameItem> = {};
      if (typeof req.body?.label === "string") patch.label = req.body.label.trim();
      if (validateGrade(req.body?.grade)) patch.grade = req.body.grade;
      if (req.body?.score !== undefined && Number.isFinite(Number(req.body.score))) {
        patch.score = Math.max(0, Math.round(Number(req.body.score)));
      }
      if (req.body?.active !== undefined) patch.active = parseBool(req.body.active);
      patch.updatedAt = nowIso();

      await col.updateOne({ _id }, { $set: patch });
      const doc = await col.findOne({ _id });
      if (!doc) return res.status(404).json({ error: "Nicht gefunden." });

      // Score-Fallback für Response
      const resp = {
        ...doc,
        _id: String(doc._id),
        score:
          Number.isFinite(Number(doc.score))
            ? Number(doc.score)
            : DEFAULT_POINTS[doc.grade as Grade],
      };

      return res.status(200).json({ item: resp });
    }

    // -------- DELETE (hart; optional: soft-delete via active=false)
    if (req.method === "DELETE") {
      const { id } = req.query as { id?: string };
      const _id = toId(id);
      if (!_id) return res.status(400).json({ error: "Ungültige id." });
      await col.deleteOne({ _id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("❌ game-catalog error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
