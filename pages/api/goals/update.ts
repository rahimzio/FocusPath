// /pages/api/goals/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB  = process.env.MONGODB_DB || "app";
const GOALS_COL   = process.env.GOALS_COLLECTION || "goals";

let _client: MongoClient | null = null;
async function getClient() {
  if (_client && (await _client.db(MONGODB_DB).command({ ping: 1 }))) return _client;
  _client = await new MongoClient(MONGODB_URI).connect();
  return _client;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { goalId, ...fields } = req.body || {};
    if (!goalId) return res.status(400).json({ ok: false, error: "goalId missing" });

    // Sicherheitsnetz: _id & userId nicht überschreiben
    delete (fields as any)._id;
    delete (fields as any).userId;

    const client = await getClient();
    const col = client.db(MONGODB_DB).collection(GOALS_COL);

    await col.updateOne(
      { _id: new ObjectId(goalId) },
      { $set: { ...fields, updatedAt: new Date().toISOString() } }
    );

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || "internal error" });
  }
}
