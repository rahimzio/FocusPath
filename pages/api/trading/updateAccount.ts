// pages/api/trading/updateAccount.ts
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

/* -------- helpers -------- */
const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};
const toStr = (v: any) =>
  v === undefined || v === null ? undefined : String(v);
const trimOrUndef = (v: any) => {
  const s = toStr(v)?.trim();
  return s ? s : undefined;
};
const toBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";
const shouldUnset = (v: any) =>
  v === null || v === "" || (Array.isArray(v) && v.length === 0);

// ISO 4217-ähnlich (3–5 Großbuchstaben; erlaubt z. B. USDT)
function normalizeCurrency(ccy: any): string | undefined {
  const s = trimOrUndef(ccy)?.toUpperCase();
  if (!s) return undefined;
  if (!/^[A-Z]{3,5}$/.test(s)) return undefined;
  return s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT" && req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const col = db.collection("trading");

    const idRaw = (req.query.id ?? (req.body?.id as any)) as string | undefined;
    if (!idRaw) return res.status(400).json({ error: "id ist erforderlich" });

    let _id: ObjectId;
    try {
      _id = new ObjectId(String(idRaw));
    } catch {
      return res.status(400).json({ error: "id ist ungültig" });
    }

    const body = req.body ?? {};
    const userId = trimOrUndef(body.userId); // optional zur Ownership-Absicherung

    console.log("📥 /api/trading/updateAccount", {
      id: String(_id),
      userId,
      name: body?.name,
      broker: body?.broker,
      currency: body?.currency,
    });

    const match: any = { _id };
    if (userId) match.userId = userId;

    const set: any = { updatedAt: new Date().toISOString() };
    const unset: any = {};

    // Name
    if ("name" in body) {
      const v = trimOrUndef(body.name);
      v ? (set.name = v) : (unset.name = "");
    }

    // Broker
    if ("broker" in body) {
      const v = trimOrUndef(body.broker);
      v ? (set.broker = v) : (unset.broker = "");
    }

    // Currency
    if ("currency" in body) {
      const v = normalizeCurrency(body.currency);
      v ? (set.currency = v) : (unset.currency = "");
    }

    // Starting Balance
    if ("startingBalance" in body) {
      const v = toNum(body.startingBalance);
      v === undefined ? (unset.startingBalance = "") : (set.startingBalance = v);
    }

    // Risk per Trade (%)
    if ("riskPerTrade" in body) {
      const v = toNum(body.riskPerTrade);
      v === undefined ? (unset.riskPerTrade = "") : (set.riskPerTrade = v);
    }

    // Optional: archivieren
    if ("archived" in body) {
      const v = toBool(body.archived);
      if (v) set.archived = true;
      else unset.archived = "";
    }

    // $set/$unset säubern
    Object.keys(set).forEach((k) => {
      const v = (set as any)[k];
      if (v === undefined || (Array.isArray(v) && v.length === 0)) delete (set as any)[k];
    });
    Object.keys(unset).forEach((k) => {
      const v = (unset as any)[k];
      if (!shouldUnset(v)) delete (unset as any)[k];
    });

    if (Object.keys(set).length === 1 && Object.keys(unset).length === 0) {
      // nur updatedAt drin → keine Felder
      return res.status(400).json({ error: "Keine gültigen Felder zum Aktualisieren übergeben." });
    }

    const update: any = {};
    if (Object.keys(set).length) update.$set = set;
    if (Object.keys(unset).length) update.$unset = unset;

    const result = await col.updateOne(match, update);
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Account nicht gefunden (oder gehört nicht zu userId)." });
    }

    console.log("✅ Account aktualisiert:", { id: String(_id), modified: result.modifiedCount });
    return res.status(200).json({ ok: true, id: String(_id), modified: result.modifiedCount });
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/updateAccount:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
