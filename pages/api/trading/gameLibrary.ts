// pages/api/trading/gameLibrary.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

const COLLECTION_NAME = "trading";
const RECORD_TYPE = "gameLibrary";

// 🔎 kleines Log-Helper
const dbg = (...args: any[]) =>
  console.log("[/api/trading/gameLibrary]", ...args);

/* ---------- helpers ---------- */
const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));
const trimOrUndef = (v: any) => {
  const s = toStr(v)?.trim();
  return s ? s : undefined;
};
const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
const toBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";

const clampGame = (g: any): "A" | "B" | "C" | undefined => {
  const s = String(g || "").toUpperCase();
  return (["A", "B", "C"] as const).includes(s as any) ? (s as any) : undefined;
};
const defaultPoints = (g: "A" | "B" | "C") => (g === "A" ? 3 : g === "B" ? 2 : 1);

function sanitizeTags(raw: any): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => trimOrUndef(x)).filter((x): x is string => !!x);
  return out.length ? out : undefined;
}

/* ---------- handler ---------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  try {
    dbg("→", req.method, "query=", req.query);
    const { db } = await connectToDatabase();
    const col = db.collection(COLLECTION_NAME);

    switch (req.method) {
      case "GET": {
        const {
          userId,
          game,
          q,
          active,
          archived,
          limit: limitRaw,
          cursor,
        } = req.query as Record<string, string | undefined>;

        if (!userId) {
          dbg("✖ missing userId");
          return res.status(400).json({ error: "userId ist erforderlich" });
        }

        const match: any = { recordType: RECORD_TYPE, userId };
        const g = clampGame(game);
        if (g) match.game = g;
        if (active !== undefined) match.active = toBool(active);
        if (archived !== undefined) match.archived = toBool(archived);
        if (q && q.trim()) {
          match.$or = [
            { label: { $regex: q.trim(), $options: "i" } },
            { tags: { $elemMatch: { $regex: q.trim(), $options: "i" } } },
          ];
        }
        if (cursor) {
          try { match._id = { $lt: new ObjectId(String(cursor)) }; } catch {}
        }

        const limit = Math.min(Math.max(Number(limitRaw ?? 100), 1), 500);

        // 🔎 Vorab: grobe Zählung für Diagnose
        const totalForUser = await col.countDocuments({ recordType: RECORD_TYPE, userId });
        const totalActiveForUser = await col.countDocuments({ recordType: RECORD_TYPE, userId, active: { $ne: false } });
        dbg("match=", match, "limit=", limit, "| totals:", { totalForUser, totalActiveForUser });

        const docs = await col.find(match).sort({ _id: -1 }).limit(limit).toArray();

        // 🔎 kurze Vorschau der ersten Doku
        if (docs.length) {
          const d0 = docs[0];
          dbg("found", docs.length, "items. first=", {
            _id: String(d0._id),
            userId: d0.userId,
            label: d0.label,
            game: d0.game,
            points: d0.points,
            active: d0.active,
            archived: d0.archived,
          });
        } else {
          dbg("found 0 items for match.");
        }

        const items = docs.map((d: any) => ({
          _id: String(d._id),
          userId: d.userId,
          label: d.label,
          game: d.game,
          points: Number(d.points ?? defaultPoints(d.game)),
          active: d.active !== false,
          tags: Array.isArray(d.tags) ? d.tags : [],
          archived: !!d.archived,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));

        // 🔎 Verteilung A/B/C + Ø Punkte (nur Diagnose)
        const counts = { A: 0, B: 0, C: 0 } as Record<"A"|"B"|"C", number>;
        let sumPts = 0;
        items.forEach(it => { counts[it.game as "A"|"B"|"C"]++; sumPts += it.points; });
        const avgPts = items.length ? (sumPts / items.length).toFixed(2) : "0.00";
        dbg("distribution=", counts, "avgPoints=", avgPts);

        const nextCursor = items.length === limit ? items[items.length - 1]._id : null;
        dbg("← GET 200 in", Date.now() - startedAt, "ms");
        return res.status(200).json({ items, nextCursor });
      }

      case "POST": {
        const body = req.body ?? {};
        dbg("POST body=", body ? Object.keys(body) : "∅");

        const userId = trimOrUndef(body.userId);
        if (!userId) {
          dbg("✖ POST missing userId");
          return res.status(400).json({ error: "userId ist erforderlich" });
        }

        const label = trimOrUndef(body.label);
        if (!label) {
          dbg("✖ POST missing label");
          return res.status(400).json({ error: "label ist erforderlich" });
        }

        const game = clampGame(body.game) ?? "A";
        const points = toNum(body.points, defaultPoints(game));
        const active = body.active === undefined ? true : toBool(body.active);
        const tags = sanitizeTags(body.tags);

        const now = new Date().toISOString();
        const doc: any = {
          recordType: RECORD_TYPE,
          userId,
          label,
          game,
          points,
          active,
          ...(tags ? { tags } : {}),
          createdAt: now,
          updatedAt: now,
        };

        const result = await col.insertOne(doc);
        dbg("POST inserted id=", String(result.insertedId));
        return res.status(200).json({
          ok: true,
          id: String(result.insertedId),
          item: { ...doc, _id: String(result.insertedId) },
        });
      }

      case "PATCH":
      case "PUT": {
        const body = req.body ?? {};
        dbg(req.method, "body keys=", Object.keys(body || {}), "query=", req.query);

        const idRaw = (req.query.id ?? body.id) as string | undefined;
        if (!idRaw) {
          dbg("✖", req.method, "missing id");
          return res.status(400).json({ error: "id ist erforderlich" });
        }

        let _id: ObjectId;
        try { _id = new ObjectId(String(idRaw)); } catch {
          dbg("✖ invalid ObjectId:", idRaw);
          return res.status(400).json({ error: "id ist ungültig" });
        }

        const userId = trimOrUndef(body.userId);
        const match: any = { _id, recordType: RECORD_TYPE };
        if (userId) match.userId = userId;

        const set: any = { updatedAt: new Date().toISOString() };
        const unset: any = {};

        if ("label" in body) {
          const v = trimOrUndef(body.label);
          v ? (set.label = v) : (unset.label = "");
        }
        if ("game" in body || "points" in body) {
          const g = "game" in body ? clampGame(body.game) : undefined;
          if (g) set.game = g;
          if ("points" in body) {
            const p = toNum(body.points);
            p === undefined ? (unset.points = "") : (set.points = p);
          } else if (g) {
            set.points = defaultPoints(g);
          }
        }
        if ("active" in body) set.active = toBool(body.active);
        if ("tags" in body) {
          const t = sanitizeTags(body.tags);
          t ? (set.tags = t) : (unset.tags = "");
        }
        if ("archived" in body) {
          const v = toBool(body.archived);
          if (v) set.archived = true;
          else unset.archived = "";
        }

        // Aufräumen
        Object.keys(set).forEach((k) => {
          const v = (set as any)[k];
          if (v === undefined || (Array.isArray(v) && v.length === 0)) delete (set as any)[k];
        });
        Object.keys(unset).forEach((k) => {
          const v = (unset as any)[k];
          if (v === undefined) delete (unset as any)[k];
        });

        if (Object.keys(set).length === 1 && Object.keys(unset).length === 0) {
          dbg("✖ nothing to update");
          return res.status(400).json({ error: "Keine gültigen Felder zum Aktualisieren übergeben." });
        }

        dbg("updateOne match=", match, "set=", set, "unset=", unset);
        const upd = await col.updateOne(match, {
          ...(Object.keys(set).length ? { $set: set } : {}),
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        });

        dbg("matched=", upd.matchedCount, "modified=", upd.modifiedCount);
        if (upd.matchedCount === 0) {
          return res.status(404).json({ error: "Item nicht gefunden (oder gehört nicht zu userId/recordType)." });
        }
        return res.status(200).json({ ok: true, id: String(_id), modified: upd.modifiedCount });
      }

      case "DELETE": {
        dbg("DELETE query=", req.query, "body keys=", Object.keys(req.body || {}));
        const idRaw = (req.query.id ?? req.body?.id) as string | undefined;
        if (!idRaw) return res.status(400).json({ error: "id ist erforderlich" });

        let _id: ObjectId;
        try { _id = new ObjectId(String(idRaw)); } catch {
          dbg("✖ invalid ObjectId:", idRaw);
          return res.status(400).json({ error: "id ist ungültig" });
        }

        const userId = trimOrUndef(req.query.userId ?? req.body?.userId);
        const mode = (trimOrUndef(req.query.mode ?? req.body?.mode) ?? "hard") as "hard" | "archive";

        const match: any = { _id, recordType: RECORD_TYPE };
        if (userId) match.userId = userId;

        if (mode === "archive") {
          dbg("archive match=", match);
          const upd = await col.updateOne(match, {
            $set: { archived: true, updatedAt: new Date().toISOString() },
          });
          dbg("archive matched=", upd.matchedCount);
          if (upd.matchedCount === 0) {
            return res.status(404).json({ error: "Item nicht gefunden (oder gehört nicht zu userId/recordType)." });
          }
          return res.status(200).json({ ok: true, mode: "archived", id: String(_id) });
        }

        dbg("hard delete match=", match);
        const del = await col.deleteOne(match);
        dbg("deleted=", del.deletedCount);
        if (del.deletedCount !== 1) {
          return res.status(404).json({ error: "Item nicht gefunden (oder gehört nicht zu userId/recordType)." });
        }
        return res.status(200).json({ ok: true, mode: "deleted", id: String(_id) });
      }

      default:
        dbg("✖ method not allowed:", req.method);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err: any) {
    dbg("❌ error:", err?.message);
    const status = Number(err?.statusCode) || 500;
    return res.status(status).json({ error: err?.message ?? "Internal Server Error" });
  } finally {
    dbg("done in", Date.now() - startedAt, "ms");
  }
}
