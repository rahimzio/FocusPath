// pages/api/trading/gameLibrary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

type Game = "A" | "B" | "C";
type Scope = "trade" | "setup" | "reflection";

type Doc = {
  _id?: any;
  type: "game_library_item";
  userId: string;
  label: string;
  game: Game;
  points: number;
  active: boolean;

  // ✅ NEW: scope (trade/setup/reflection)
  scope: Scope;

  tags?: string[];
  archived?: boolean;

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

function clampGame(x: any): Game | undefined {
  const v = String(x ?? "").trim().toUpperCase();
  if (v === "A" || v === "B" || v === "C") return v;
  return undefined;
}
function clampScope(x: any): Scope | undefined {
  const v = String(x ?? "").trim().toLowerCase();
  if (v === "trade" || v === "setup" || v === "reflection") return v as Scope;
  return undefined;
}
function defaultPoints(game: Game) {
  return game === "A" ? 3 : game === "B" ? 2 : 1;
}
function toBool(x: any) {
  if (typeof x === "boolean") return x;
  const s = String(x ?? "").trim().toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return !!x;
}
function toNum(x: any, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}
function trimOrUndef(x: any): string | undefined {
  const s = String(x ?? "").trim();
  return s ? s : undefined;
}
function sanitizeTags(input: any): string[] | undefined {
  if (!input) return undefined;
  const arr = Array.isArray(input) ? input : String(input).split(",");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const t = String(raw ?? "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length ? out : undefined;
}

function encodeCursor(lastId?: any) {
  if (!lastId) return null;
  return String(lastId);
}

function parseCursor(cursor: any) {
  const c = trimOrUndef(cursor);
  if (!c) return null;
  try {
    return new ObjectId(c);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection<Doc>("trading");

  const dbg = (...args: any[]) => console.log("[API gameLibrary]", ...args);

  // Indizes (idempotent)
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, archived: 1 }),
      col.createIndex({ type: 1, userId: 1, active: 1 }),
      col.createIndex({ type: 1, userId: 1, scope: 1 }),
      col.createIndex({ type: 1, userId: 1, game: 1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
    ]);
  } catch (e: any) {
    console.warn("[API gameLibrary] index warn:", e?.message);
  }

  if (req.method === "GET") {
    const userId = typeof req.query.userId === "string" ? req.query.userId : "";
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const scope = clampScope(req.query.scope) ?? undefined;
    const game = clampGame(req.query.game) ?? undefined;

    const activeOnly = req.query.active === undefined ? undefined : toBool(req.query.active);
    const archived = req.query.archived === undefined ? undefined : toBool(req.query.archived);

    const q = trimOrUndef(req.query.q);
    const limit = Math.min(Math.max(toNum(req.query.limit, 50), 1), 500);

    const cursorId = parseCursor(req.query.cursor);

    const filter: any = {
      type: "game_library_item",
      userId,
      deleted: { $ne: true },
    };

    if (scope) filter.scope = scope;
    if (game) filter.game = game;

    if (activeOnly === true) filter.active = true;

    if (archived === true) filter.archived = true;
    if (archived === false) filter.archived = { $ne: true };

    if (q) {
      filter.$or = [
        { label: { $regex: q, $options: "i" } },
        { tags: { $elemMatch: { $regex: q, $options: "i" } } },
      ];
    }

    if (cursorId) {
      filter._id = { $lt: cursorId };
    }

    try {
      const items = await col
        .find(filter)
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();

      const nextCursor = items.length === limit ? encodeCursor(items[items.length - 1]._id) : null;

      return res.status(200).json({
        items,
        nextCursor,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API gameLibrary][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      dbg("POST body=", body ? Object.keys(body) : "∅");

      const userId = trimOrUndef(body.userId);
      if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

      const label = trimOrUndef(body.label);
      if (!label) return res.status(400).json({ error: "label ist erforderlich" });

      const game = clampGame(body.game) ?? "A";
      const points = toNum(body.points, defaultPoints(game));
      const active = body.active === undefined ? true : toBool(body.active);
      const tags = sanitizeTags(body.tags);

      // ✅ NEW: scope (default trade)
      const scope = clampScope(body.scope) ?? "trade";

      const nowIso = new Date().toISOString();

      const doc: Doc = {
        type: "game_library_item",
        userId,
        label,
        game,
        points,
        active,
        scope,
        tags,
        archived: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        deleted: false,
      };

      const result = await col.insertOne(doc as any);
      const saved = await col.findOne({ _id: result.insertedId });

      return res.status(200).json({
        ok: true,
        item: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API gameLibrary][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "PATCH") {
    const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
    const id = typeof req.query.id === "string" ? req.query.id : "";

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!id) return res.status(400).json({ error: "id ist erforderlich (?id=...)" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "invalid id" });
    }

    try {
      const body = req.body ?? {};

      const nowIso = new Date().toISOString();

      const set: Partial<Doc> = {
        updatedAt: nowIso,
      };

      const unset: any = {};

      const label = trimOrUndef(body.label);
      if (body.label !== undefined) {
        if (!label) return res.status(400).json({ error: "label darf nicht leer sein" });
        set.label = label;
      }

      const game = clampGame(body.game);
      if (body.game !== undefined) {
        if (!game) return res.status(400).json({ error: "game muss A/B/C sein" });
        set.game = game;
      }

      if (body.points !== undefined) {
        set.points = toNum(body.points, 0);
      }

      if (body.active !== undefined) {
        set.active = toBool(body.active);
      }

      // ✅ NEW: scope update
      if (body.scope !== undefined) {
        const sc = clampScope(body.scope);
        if (!sc) return res.status(400).json({ error: "scope muss trade/setup/reflection sein" });
        set.scope = sc;
      }

      if (body.tags !== undefined) {
        const tags = sanitizeTags(body.tags);
        if (!tags) unset.tags = "";
        else set.tags = tags;
      }

      if (body.archived !== undefined) {
        set.archived = toBool(body.archived);
      }

      // cleanup
      Object.keys(set).forEach((k) => {
        const v = (set as any)[k];
        if (v === undefined || (Array.isArray(v) && v.length === 0)) delete (set as any)[k];
      });
      Object.keys(unset).forEach((k) => {
        const v = (unset as any)[k];
        if (v === undefined) delete (unset as any)[k];
      });

      if (Object.keys(set).length === 1 && Object.keys(unset).length === 0) {
        return res.status(400).json({ error: "Keine gültigen Felder zum Aktualisieren übergeben." });
      }

      const match: any = { _id, type: "game_library_item", userId, deleted: { $ne: true } };

      dbg("updateOne match=", match, "set=", set, "unset=", unset);

      await col.updateOne(
        match,
        Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
      );

      const saved = await col.findOne({ _id });

      return res.status(200).json({
        ok: true,
        item: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    } catch (e: any) {
      console.error("[API gameLibrary][PATCH] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "DELETE") {
    const id = typeof req.query.id === "string" ? req.query.id : "";
    const mode = typeof req.query.mode === "string" ? req.query.mode : "";

    if (!id) return res.status(400).json({ error: "id ist erforderlich (?id=...)" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "invalid id" });
    }

    try {
      const nowIso = new Date().toISOString();

      // soft archive
      if (mode === "archive") {
        await col.updateOne(
          { _id, type: "game_library_item" },
          { $set: { archived: true, updatedAt: nowIso } }
        );
        const saved = await col.findOne({ _id });
        return res.status(200).json({ ok: true, item: saved ?? null });
      }

      // hard delete (soft delete flag)
      await col.updateOne(
        { _id, type: "game_library_item" },
        { $set: { deleted: true, updatedAt: nowIso } }
      );

      return res.status(200).json({ ok: true });
    } catch (e: any) {
      console.error("[API gameLibrary][DELETE] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
