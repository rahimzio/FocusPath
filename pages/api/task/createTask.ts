// /pages/api/tasks/createTask.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MongoClient, ObjectId } from "mongodb";
import { computeGoalProgress } from "@/utils/goals/progress";
import { recalcGoalProgress } from "@/lib/server/recalcGoalProgress";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "app";
const GOALS_COL = process.env.GOALS_COLLECTION || "goals";

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
    const { goalId, task } = req.body as { goalId?: string; task?: any };
    if (!goalId || !task) return res.status(400).json({ ok: false, error: "goalId and task required" });

    const client = await getClient();
    const col = client.db(MONGODB_DB).collection(GOALS_COL);

    // neue Task-ID vergeben (String, kompatibel mit ArrayFilters)
    const newTask = {
      _id: String(new ObjectId()),
      status: "todo",
      subTasks: [],
      ...task,
    };

    await col.updateOne(
      { _id: new ObjectId(goalId) },
      { $push: { tasks: newTask }, $set: { updatedAt: new Date().toISOString() } }
    );

    const updated = await col.findOne({ _id: new ObjectId(goalId) }) as any;
    if (!updated) return res.status(404).json({ ok: false, error: "goal not found after insert" });

    const progress = computeGoalProgress({ tasks: updated.tasks ?? [], subGoals: updated.subGoals ?? [] } as any);
    const completedAt = progress === 100 ? (updated.completedAt ?? new Date().toISOString()) : null;

    await col.updateOne(
      { _id: new ObjectId(goalId) },
      { $set: { progress, completedAt, updatedAt: new Date().toISOString() } }
    );
await recalcGoalProgress((req as any).body?.goalId);

    return res.status(200).json({ ok: true, goalId, task: newTask, progress, completedAt });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e?.message || "internal error" });
  }
}
