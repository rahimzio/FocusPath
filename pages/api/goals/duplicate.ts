// /pages/api/goals/duplicate.ts
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
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const { goalId } = req.body as { goalId?: string };
    if (!goalId) return res.status(400).json({ error: "goalId missing" });

    const client = await getClient();
    const col = client.db(MONGODB_DB).collection(GOALS_COL);

    const original = await col.findOne({ _id: new ObjectId(goalId) }) as any;
    if (!original) return res.status(404).json({ error: "goal not found" });

    // tiefe Kopie + IDs entfernen
    const deepCopy = (obj: any) => JSON.parse(JSON.stringify(obj));
    const copy = deepCopy(original);

    // IDs leeren
    delete copy._id;
    if (Array.isArray(copy.tasks)) {
      copy.tasks = copy.tasks.map((t: any) => ({
        ...t,
        _id: String(new ObjectId()),
        subTasks: Array.isArray(t.subTasks)
          ? t.subTasks.map((s: any) => ({ ...s, _id: String(new ObjectId()), status: "todo" }))
          : [],
        status: "todo",
      }));
    }
    if (Array.isArray(copy.subGoals)) {
      copy.subGoals = copy.subGoals.map((g: any) => ({ ...g, _id: String(new ObjectId()), progress: 0, completedAt: null }));
    }

    copy.title = `${original.title} (Kopie)`;
    copy.progress = 0;
    copy.completedAt = null;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;

    const { insertedId } = await col.insertOne(copy);
    const goal = { ...copy, _id: insertedId };

    return res.status(200).json({ goal });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "internal error" });
  }
}
