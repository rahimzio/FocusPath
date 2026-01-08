// pages/api/trading/improve/drills.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type Scope = "trade" | "setup" | "reflection" | "all";
type Game = "A" | "B" | "C";

// Drill Doc (alles in "trading" collection)
type DrillDoc = {
  _id?: any;
  type: "improve_drill_v1";
  userId: string;

  title: string;               // Drill Name
  description?: string;        // wie/warum
  active?: boolean;            // aktiv im Drillboard
  archived?: boolean;          // archiviert
  archivedAt?: string;         // ✅ ADD
  tags?: string[];             // optional (z.B. "hesitation", "discipline")

  // Mapping zu Improve Factors (z.B. aus gameLibrary)
  // -> factorIds referenziert GameLibrary Items (trade/setup/reflection scopes)
  factorIds?: string[];        // 1..n
  scope?: Scope;               // optional: default "all"

  // Optional: Zielrichtung
  // A: häufiger machen, C: weniger machen
  targetGame?: Game;           // z.B. "A" oder "C"
  minCount?: number;           // optional: A min in Zeitraum
  maxCount?: number;           // optional: C max in Zeitraum

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;          // ✅ ADD
};

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function toIsoNow() {
  return new Date().toISOString();
}

/** dedupe + trim string arrays safely (returns undefined if nothing left) */
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

/**
 * ✅ ADD:
 * For PATCH use-cases where you want to CLEAR tags/factorIds:
 * - if input is an array and becomes empty after trimming => return []
 * - if input is not an array => undefined
 */
function uniqStringsOrEmpty(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const cleaned = uniqStrings(input);
  return cleaned ?? []; // explicit clear
}

/** remove undefined keys recursively (keeps false/0/"") */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> | undefined {
  if (!obj || typeof obj !== "object") return obj;

  const out: any = Array.isArray(obj) ? [] : {};
  let hasAny = false;

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;

    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = stripUndefined(v);
      if (nested && Object.keys(nested).length > 0) {
        out[k] = nested;
        hasAny = true;
      }
      continue;
    }

    out[k] = v;
    hasAny = true;
  }

  return hasAny ? out : undefined;
}

function normalizeScope(x: any): Scope | undefined {
  const s = String(x || "").trim().toLowerCase();
  if (s === "trade" || s === "setup" || s === "reflection" || s === "all") return s;
  return undefined;
}

function normalizeGame(x: any): Game | undefined {
  return x === "A" || x === "B" || x === "C" ? x : undefined;
}

// Cursor Pagination: cursor = last _id
function parseCursor(cursor: any): ObjectId | null {
  try {
    if (!cursor) return null;
    const s = String(cursor).trim();
    if (!s) return null;
    return new ObjectId(s);
  } catch {
    return null;
  }
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
  const col = db.collection<DrillDoc>("trading");

  // Indizes (idempotent)
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, archived: 1 }),
      col.createIndex({ type: 1, userId: 1, active: 1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
      col.createIndex({ type: 1, userId: 1, updatedAt: -1 }), // ✅ ADD
      col.createIndex({ type: 1, userId: 1, title: 1 }),
    ]);
  } catch (e: any) {
    console.warn("[API improve/drills] index warn:", e?.message);
  }

  /**
   * GET /api/trading/improve/drills?userId=...&id=...
   * -> single drill
   *
   * GET /api/trading/improve/drills?userId=...&q=...&active=true&archived=false&limit=50&cursor=...
   * -> list drills
   */
  if (req.method === "GET") {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) return res.status(400).json({ error: "userId required" });

    // ✅ ADD: single fetch by id
    const singleId = parseObjectId(req.query.id);
    if (singleId) {
      try {
        const doc = await col.findOne({
          _id: singleId,
          type: "improve_drill_v1",
          userId,
          deleted: { $ne: true },
        });

        return res.status(200).json({
          drill: doc ?? null,
          meta: { durationMs: Date.now() - startedAt },
        });
      } catch (e: any) {
        console.error("[API improve/drills][GET single] ERROR:", e?.message, e);
        return res.status(500).json({ error: e?.message ?? "Server error" });
      }
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const active = typeof req.query.active === "string" ? req.query.active === "true" : undefined;
    const archived = typeof req.query.archived === "string" ? req.query.archived === "true" : undefined;
    const scope = normalizeScope(req.query.scope);
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

    const cursorId = parseCursor(req.query.cursor);

    const filter: any = {
      type: "improve_drill_v1",
      userId,
      deleted: { $ne: true },
    };

    if (active !== undefined) filter.active = active;
    if (archived !== undefined) filter.archived = archived;
    if (scope) filter.scope = scope;

    if (cursorId) filter._id = { $gt: cursorId };

    if (q) {
      // simple search in title + tags
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { tags: { $elemMatch: { $regex: q, $options: "i" } } },
      ];
    }

    try {
      const docs = await col
        .find(filter)
        .sort({ _id: 1 })
        .limit(limit + 1)
        .toArray();

      const hasMore = docs.length > limit;
      const items = hasMore ? docs.slice(0, limit) : docs;

      const nextCursor = hasMore ? String(items[items.length - 1]._id) : null;

      return res.status(200).json({
        items,
        nextCursor,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API improve/drills][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  /**
   * POST /api/trading/improve/drills
   * body: { userId, title, description?, factorIds?, factorId?, scope?, targetGame?, minCount?, maxCount?, tags?, active? }
   */
  if (req.method === "POST") {
    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();
    const title = String(body.title || "").trim();

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!title) return res.status(400).json({ error: "title required" });

    const nowIso = toIsoNow();

    // ✅ FIX: factorIds precedence bug
    const incomingFactorIds =
      body.factorIds !== undefined
        ? body.factorIds
        : body.factorId
          ? [body.factorId]
          : undefined;

    const doc: DrillDoc =
      (stripUndefined({
        type: "improve_drill_v1",
        userId,

        title,
        description: typeof body.description === "string" ? body.description : undefined,
        tags: uniqStrings(body.tags),

        factorIds: uniqStrings(incomingFactorIds),
        scope: normalizeScope(body.scope) ?? "all",

        targetGame: normalizeGame(body.targetGame),
        minCount: Number.isFinite(Number(body.minCount)) ? Number(body.minCount) : undefined,
        maxCount: Number.isFinite(Number(body.maxCount)) ? Number(body.maxCount) : undefined,

        active: body.active === undefined ? true : !!body.active,
        archived: !!body.archived,
        archivedAt: body.archived ? nowIso : undefined,

        createdAt: nowIso,
        updatedAt: nowIso,
        deleted: false,
      }) as DrillDoc) ?? ({
        type: "improve_drill_v1",
        userId,
        title,
        createdAt: nowIso,
        updatedAt: nowIso,
        active: true,
        archived: false,
        deleted: false,
      } as DrillDoc);

    try {
      const result = await col.insertOne(doc as any);

      const saved = await col.findOne({ _id: result.insertedId });
      return res.status(201).json({
        ok: true,
        drill: saved ?? null,
      });
    } catch (e: any) {
      console.error("[API improve/drills][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  /**
   * PATCH /api/trading/improve/drills?id=...
   * body: { userId, ...fields }
   */
  if (req.method === "PATCH") {
    const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!id) return res.status(400).json({ error: "id required" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "invalid id" });
    }

    const nowIso = toIsoNow();

    // Nur setzen, wenn vorhanden (keine Sideeffects)
    const update: any = { updatedAt: nowIso };

    if (body.title !== undefined && isNonEmptyString(body.title)) update.title = String(body.title).trim();
    if (body.description !== undefined && typeof body.description === "string") update.description = body.description;

    // ✅ allow clearing tags by sending []
    if (body.tags !== undefined) {
      const tags = uniqStringsOrEmpty(body.tags);
      if (tags !== undefined) update.tags = tags;
    }

    // ✅ allow clearing factorIds by sending []
    if (body.factorIds !== undefined || body.factorId !== undefined) {
      const incomingFactorIds =
        body.factorIds !== undefined
          ? body.factorIds
          : body.factorId
            ? [body.factorId]
            : undefined;

      const ids = uniqStringsOrEmpty(incomingFactorIds);
      if (ids !== undefined) update.factorIds = ids;
    }

    if (body.scope !== undefined) {
      const sc = normalizeScope(body.scope);
      if (sc) update.scope = sc;
    }

    if (body.targetGame !== undefined) {
      const g = normalizeGame(body.targetGame);
      if (g) update.targetGame = g;
    }

    if (body.minCount !== undefined) {
      const n = Number(body.minCount);
      if (Number.isFinite(n)) update.minCount = n;
    }

    if (body.maxCount !== undefined) {
      const n = Number(body.maxCount);
      if (Number.isFinite(n)) update.maxCount = n;
    }

    if (body.active !== undefined) update.active = !!body.active;

    if (body.archived !== undefined) {
      const next = !!body.archived;
      update.archived = next;
      if (next) update.archivedAt = nowIso;
      // unarchive: we do NOT delete archivedAt (history safe)
    }

    try {
      const existing = await col.findOne({
        _id,
        type: "improve_drill_v1",
        userId,
        deleted: { $ne: true },
      });

      if (!existing) return res.status(404).json({ error: "Drill not found" });

      await col.updateOne(
        { _id, type: "improve_drill_v1", userId },
        { $set: update }
      );

      const saved = await col.findOne({ _id, type: "improve_drill_v1", userId });
      return res.status(200).json({ ok: true, drill: saved ?? null });
    } catch (e: any) {
      console.error("[API improve/drills][PATCH] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  /**
   * DELETE /api/trading/improve/drills?id=...&mode=archive
   * - mode=archive => soft archive
   * - default => soft delete
   */
  if (req.method === "DELETE") {
    const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
    const mode = typeof req.query.mode === "string" ? req.query.mode.trim() : "";
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";

    if (!userId) return res.status(400).json({ error: "userId required (query)" });
    if (!id) return res.status(400).json({ error: "id required" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "invalid id" });
    }

    const nowIso = toIsoNow();

    try {
      const existing = await col.findOne({
        _id,
        type: "improve_drill_v1",
        userId,
        deleted: { $ne: true },
      });

      if (!existing) return res.status(404).json({ error: "Drill not found" });

      if (mode === "archive") {
        await col.updateOne(
          { _id, type: "improve_drill_v1", userId },
          { $set: { archived: true, archivedAt: nowIso, updatedAt: nowIso } }
        );
      } else {
        await col.updateOne(
          { _id, type: "improve_drill_v1", userId },
          { $set: { deleted: true, deletedAt: nowIso, updatedAt: nowIso } }
        );
      }

      const saved = await col.findOne({ _id, type: "improve_drill_v1", userId });
      return res.status(200).json({ ok: true, drill: saved ?? null });
    } catch (e: any) {
      console.error("[API improve/drills][DELETE] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
