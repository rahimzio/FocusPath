// pages/api/trading/strategies.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, Db } from "mongodb";

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
  const dbName = process.env.MONGODB_DB || (new URL(uri).pathname.replace("/", "") || "trading");
  _db = _client.db(dbName);
  console.log("✅ DB-Verbindung erfolgreich");
  return _db;
}

// deterministische Farbe aus Name (HSL → Hex)
function colorFromName(name: string): string {
  const s = (name || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 60; // %
  const light = 45; // %
  // HSL → RGB → Hex (quick’n’dirty)
  const c = (1 - Math.abs(2 * light / 100 - 1)) * (sat / 100);
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light / 100 - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const toHex = (v: number) => {
    const n = Math.round((v + m) * 255);
    return n.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const db = await getDb();
    const col = db.collection("trading"); // ggf. Collection-Namen anpassen

    const {
      userId,
      accountId,
      from,
      to,
      limit: limitRaw,
      q, // optionales Suchwort
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const limit = Math.min(Math.max(Number(limitRaw ?? 50), 1), 200);

    // Match: nur echte Trade-Entries des Users
    const match: any = { userId, type: "tradeEntry" };
    if (accountId) match.accountId = accountId;
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = String(from).slice(0, 10);
      if (to) match.date.$lte = String(to).slice(0, 10);
    }

    // Ein Strategy-Feld erzeugen: bevorzugt strategy_name, sonst strategy
    // filtern auf non-empty
    const pipeline: any[] = [
      { $match: match },
      {
        $addFields: {
          _str1: { $ifNull: ["$strategy_name", ""] },
          _str2: { $ifNull: ["$strategy", ""] },
        },
      },
      {
        $addFields: {
          strategyName: {
            $cond: [
              { $ne: [{ $strLenCP: "$_str1" }, 0] },
              "$_str1",
              "$_str2",
            ],
          },
        },
      },
      {
        $addFields: {
          strategyName: { $trim: { input: "$strategyName" } },
          _norm: { $toLower: { $trim: { input: "$strategyName" } } },
        },
      },
      { $match: { strategyName: { $exists: true, $ne: "" } } },
    ];

    // optional Text-Filter
    if (q && q.trim()) {
      pipeline.push({
        $match: { _norm: { $regex: q.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") } },
      });
    }

    // Gruppieren (case-insensitive), aber "schönsten" Namen behalten
    pipeline.push(
      {
        $group: {
          _id: "$_norm",
          name: { $first: "$strategyName" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, name: 1 } },
      { $limit: limit },
    );

    const rows = await col.aggregate(pipeline).toArray();

    const out = rows.map((r: any) => ({
      _id: String(r._id),
      name: String(r.name),
      count: Number(r.count ?? 0),
      tag_color: colorFromName(String(r.name)),
    }));

    return res.status(200).json(out);
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/strategies:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
