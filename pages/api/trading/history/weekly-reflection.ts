// pages/api/trading/history/weekly.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";
import { getMonthFourSegments } from "@/utils/time/periods";

const uri = process.env.MONGODB_URI!; const dbName = process.env.MONGODB_DB || "app";
let _client: MongoClient | null = null;
async function getClient(){ if(_client) return _client; _client = await new MongoClient(uri).connect(); return _client; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, month } = req.query as { userId: string; month: string };
    if (!userId || !month) return res.status(400).json({ error: "userId & month required" });

    const client = await getClient(); const db = client.db(dbName);
    const Weekly = db.collection("weekly_reflections");

    const segs = getMonthFourSegments(month);
    const weeks = await Weekly.find(
      { userId, label: { $in: segs.map(s=>s.label) } },
      { projection: { _id: 0 } }
    ).toArray();

    const byLabel = new Map(weeks.map(w => [w.label, w]));
    const ordered = segs.map(seg => byLabel.get(seg.label) || { label: seg.label, period: { start: seg.start, end: seg.end }, missing: true });

    res.status(200).json({ month, weeks: ordered });
  } catch (e) {
    console.error(e); res.status(500).json({ error: "internal_error" });
  }
}
