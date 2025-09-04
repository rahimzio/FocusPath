// pages/api/trading/deleteAccount.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, Db, ObjectId } from "mongodb";

let _client: MongoClient | null = null;
let _db: Db | null = null;

async function getDb(): Promise<Db> {
  if (_db) {
    console.log("🔄 Verwende bestehende MongoDB-Verbindung.");
    return _db;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI fehlt in der Umgebung.");
  console.log("✅ Verbindung zur Datenbank wird aufgebaut …");
  _client = await MongoClient.connect(uri);
  const dbName =
    process.env.MONGODB_DB || new URL(uri).pathname.replace("/", "") || "trading";
  _db = _client.db(dbName);
  console.log("✅ DB-Verbindung erfolgreich");
  return _db;
}

const trimOrUndef = (v: any) => {
  const s = v === undefined || v === null ? undefined : String(v).trim();
  return s || undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const accounts = db.collection("trading");
    const trades = db.collection("trading");

    const idRaw = (req.query.id ?? (req.body?.id as any)) as string | undefined;
    if (!idRaw) return res.status(400).json({ error: "id ist erforderlich" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(String(idRaw));
    } catch {
      return res.status(400).json({ error: "id ist ungültig" });
    }

    const userId = trimOrUndef(req.query.userId ?? req.body?.userId);
    const mode = (trimOrUndef(req.query.mode) ?? "auto") as "auto" | "archive";

    const match: any = { _id };
    if (userId) match.userId = userId;

    // Account holen (Ownership prüfen)
    const acc = await accounts.findOne(match);
    if (!acc) return res.status(404).json({ error: "Account nicht gefunden (oder gehört nicht zu userId)." });

    // Anhängige Trades zählen
    const tradeMatch: any = { accountId: String(acc._id) };
    if (userId) tradeMatch.userId = userId;
    const tradeCount = await trades.countDocuments(tradeMatch);

    console.log("📥 /api/trading/deleteAccount", {
      id: String(_id),
      userId,
      mode,
      tradeCount,
    });

    // Immer archivieren, wenn mode=archive
    if (mode === "archive") {
      await accounts.updateOne(
        { _id },
        { $set: { archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
      );
      return res.status(200).json({ ok: true, mode: "archived", trades: tradeCount });
    }

    // auto: wenn Trades hängen → archivieren; sonst hard delete
    if (tradeCount > 0) {
      await accounts.updateOne(
        { _id },
        { $set: { archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
      );
      return res.status(200).json({
        ok: true,
        mode: "archived",
        reason: "Account hat noch Trades; zur Konsistenz archiviert statt gelöscht.",
        trades: tradeCount,
      });
    }

    // keine Trades → wirklich löschen
    const result = await accounts.deleteOne({ _id });
    if (result.deletedCount !== 1) {
      return res.status(500).json({ error: "Account konnte nicht gelöscht werden." });
    }
    console.log("✅ Account gelöscht:", { id: String(_id) });
    return res.status(200).json({ ok: true, mode: "deleted" });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/deleteAccount:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
