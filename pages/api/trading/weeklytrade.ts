// pages/api/trading/weekly.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!; const dbName = process.env.MONGODB_DB || "app";
let _client: MongoClient | null = null;
async function getClient(){ if(_client) return _client; _client = await new MongoClient(uri).connect(); return _client; }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, label } = req.query as { userId: string; label: string }; // "YYYY-MM Wn"
    if (!userId || !label) return res.status(400).json({ error: "userId & label required" });

    const client = await getClient(); const db = client.db(dbName);
    const Weekly = db.collection("weekly_reflections");
    const doc = await Weekly.findOne({ userId, label }, { projection: { _id: 0 } });
    if (!doc) return res.status(404).json({ error: "not_found" });
    res.status(200).json(doc);
  } catch (e) {
    console.error(e); res.status(500).json({ error: "internal_error" });
  }
}
