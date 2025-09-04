// pages/api/trading/strategies/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";
import { getTradingCollection } from "../../db/mongo";

type StrategyDoc = {
  _id?: any;
  type: "strategy";
  userId: string;
  name: string;
  description?: string;
  tag_color?: string;
  confluences?: string[];
  archived?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId } = req.query as { userId?: string };
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : undefined;
    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // 1) Alle explizit angelegten Strategien holen
    const strategies = await col
      .find<StrategyDoc>({
        type: "strategy",
        userId,
        archived: { $ne: true },
        deleted: { $ne: true },
      }, {
        projection: { name: 1, tag_color: 1, description: 1, confluences: 1 },
      })
      .sort({ name: 1 })
      .toArray();

    // 2) Counts je Strategie aus Trade-Entries
    const match: any = {
      type: "tradeEntry",
      userId,
      archived: { $ne: true },
      deleted: { $ne: true },
    };
    if (accountId) match.accountId = accountId;

    const counts = await col.aggregate([
      { $match: match },
      { $addFields: {
          _strategy: {
            $ifNull: [
              { $ifNull: ["$strategy", "$strategy_name"] },
              null
            ]
          }
        }
      },
      { $match: { _strategy: { $ne: null } } },
      { $group: { _id: "$_strategy", c: { $sum: 1 } } },
      { $project: { _id: 0, name: "$_id", count: "$c" } },
    ]).toArray();

    const countMap = new Map<string, number>(counts.map((x: any) => [String(x.name), Number(x.count || 0)]));

    // 3) Mergen + auch "nur in Trades" vorkommende Namen ergänzen
    const byName = new Map<string, any>();
    strategies.forEach(s => {
      byName.set(s.name, {
        _id: String(s._id),
        name: s.name,
        tag_color: s.tag_color,
        description: s.description,
        confluences: s.confluences ?? [],
        count: countMap.get(s.name) ?? 0,
      });
    });

    counts.forEach((row: any) => {
      const n = String(row.name);
      if (!byName.has(n)) {
        byName.set(n, { name: n, count: Number(row.count || 0) });
      }
    });

    return res.status(200).json(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err: any) {
    console.error("❌ /api/trading/strategies:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
