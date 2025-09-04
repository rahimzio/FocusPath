// /pages/api/goals/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB  = process.env.MONGODB_DB || "app";
const GOALS_COL   = process.env.GOALS_COLLECTION || "goals";

let _client: MongoClient | null = null;
async function getClient() {
  if (_client) return _client;
  _client = await new MongoClient(MONGODB_URI).connect();
  return _client;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const client = await getClient();
    const col = client.db(MONGODB_DB).collection(GOALS_COL);

    await col.deleteOne({ _id: new ObjectId(String(id)) });
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || "internal error" });
  }
}
