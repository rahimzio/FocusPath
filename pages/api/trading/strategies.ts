// pages/api/trading/strategies.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, getTradingCollection } from "../db/mongo";

/** deterministische Farbe aus Name (HSL → Hex) */
function colorFromName(name: string): string {
  const s = (name || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const sat = 60; // %
  const light = 45; // %
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
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // defensive indexes (idempotent, optional)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, date: 1 }),
        col.createIndex({ userId: 1, type: 1, strategy_name: 1 }),
        col.createIndex({ userId: 1, type: 1, strategy: 1 }),
        col.createIndex({ userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    const {
      userId,
      accountId,
      from,
      to,
      limit: limitRaw,
      q,
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const limit = Math.max(1, Math.min(200, Number(limitRaw ?? 50) || 50));

    const match: any = {
      userId,
      type: "tradeEntry",
      archived: { $ne: true },
      deleted: { $ne: true },
    };
    if (accountId) match.accountId = accountId;
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = String(from).slice(0, 10);
      if (to) match.date.$lte = String(to).slice(0, 10);
    }

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
            $cond: [{ $ne: [{ $strLenCP: "$_str1" }, 0] }, "$_str1", "$_str2"],
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

    if (q && q.trim()) {
      // lowercase vergleichen; Regex sicher escapen
      const esc = q.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({ $match: { _norm: { $regex: esc } } });
    }

    pipeline.push(
      {
        $group: {
          _id: "$_norm",
          name: { $first: "$strategyName" }, // "hübscheste" Schreibweise behalten
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1, name: 1 } },
      { $limit: limit }
    );

    const rows = await col.aggregate(pipeline).toArray();

    // Frontend erwartet ein Array (kein {items})
    const out = rows.map((r: any) => ({
      _id: String(r._id),
      name: String(r.name),
      count: Number(r.count ?? 0),
      tag_color: colorFromName(String(r.name)),
    }));

    // kleine Cache-Hilfe für Edge/Proxy
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(out);
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/strategies:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
