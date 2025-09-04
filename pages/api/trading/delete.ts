// pages/api/trading/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

const trimOrUndef = (v: any) => {
  const s = v === undefined || v === null ? undefined : String(v).trim();
  return s || undefined;
};

function parseIds(queryId?: string, queryIds?: string, bodyIds?: unknown): ObjectId[] {
  const raw: string[] = [];
  if (queryId) raw.push(queryId);
  if (queryIds) raw.push(...queryIds.split(",").map(s => s.trim()).filter(Boolean));
  if (Array.isArray(bodyIds)) {
    for (const v of bodyIds) {
      if (typeof v === "string" && v.trim()) raw.push(v.trim());
    }
  }
  const out: ObjectId[] = [];
  for (const s of raw) {
    try { out.push(new ObjectId(s)); } catch { /* skip invalid */ }
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["DELETE", "PATCH"].includes(req.method || "")) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading"); // konsistent zu den anderen Routen

    const idQ  = req.query.id as string | undefined;
    const idsQ = req.query.ids as string | undefined;
    const idsBody = req.body?.ids;
    const ids = parseIds(idQ, idsQ, idsBody);
    if (ids.length === 0) return res.status(400).json({ error: "id oder ids erforderlich" });

    const userId = trimOrUndef(req.query.userId ?? req.body?.userId);

    // PATCH erzwingt restore
    const reqMode = (trimOrUndef(req.query.mode) ?? trimOrUndef(req.body?.mode) ?? "archive") as
      | "hard" | "archive" | "restore";

    const mode: "hard" | "archive" | "restore" = req.method === "PATCH" ? "restore" : reqMode;

    const dryRun = String(req.query.dryRun ?? req.body?.dryRun ?? "false").toLowerCase() === "true";
    const confirm = (trimOrUndef(req.query.confirm) ?? trimOrUndef(req.body?.confirm)) || "";

    // Basis-Match: nur echte Trade-Entries
    const matchBase: any = { _id: { $in: ids }, type: "tradeEntry" };
    if (userId) matchBase.userId = userId;

    // Vorprüfung
    const existing = await col.find(matchBase, { projection: { _id: 1 } }).toArray();
    if (existing.length === 0) {
      return res.status(404).json({ error: "Keine passenden Trades gefunden (id/userId prüfen)." });
    }
    const existingIds = existing.map(d => String(d._id));

    if (dryRun) {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        mode,
        matched: existing.length,
        ids: existingIds,
      });
    }

    // Hard-Delete nur mit Bestätigung; andernfalls auf archive downgraden
    let effectiveMode = mode;
    let safetyNote: string | undefined;
    if (mode === "hard" && confirm.toLowerCase() !== "hard") {
      effectiveMode = "archive";
      safetyNote = "Hard-Delete ohne confirm=hard → auf archive herabgestuft.";
    }

    if (effectiveMode === "restore") {
      const upd = await col.updateMany(
        matchBase,
        {
          $set: { updatedAt: new Date().toISOString() },
          $unset: { archived: "", deleted: "", deletedAt: "", status: "" },
        }
      );
      return res.status(200).json({
        ok: true,
        mode: "restored",
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
        ids: existingIds,
      });
    }

    if (effectiveMode === "archive") {
      const now = new Date().toISOString();
      const upd = await col.updateMany(
        matchBase,
        {
          $set: {
            archived: true,
            deleted: true,
            status: "deleted",
            deletedAt: now,
            updatedAt: now,
          },
        }
      );
      return res.status(200).json({
        ok: true,
        mode: "archived",
        matched: upd.matchedCount,
        modified: upd.modifiedCount,
        ids: existingIds,
        note: safetyNote,
      });
    }

    // effectiveMode === "hard"
    const del = await col.deleteMany(matchBase);
    return res.status(200).json({
      ok: true,
      mode: "deleted",
      deleted: del.deletedCount,
      ids: existingIds,
    });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/delete:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
