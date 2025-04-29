// pages/api/goals/getGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId parameter." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // 1. Lade alle Goals
    const rawGoals = await appData
      .find({ type: "goal", userId })
      .project({ type: 0 })
      .toArray();

    // 2. Falls Tasks vorhanden, einzeln nachladen
    const goalsWithTasks = await Promise.all(
      rawGoals.map(async (goal) => {
        if (!goal.tasks || goal.tasks.length === 0) {
          return { ...goal, tasks: [] };
        }

        const taskObjectIds = goal.tasks.map((id: string) => new ObjectId(id));
        const tasks = await appData
          .find({ _id: { $in: taskObjectIds }, type: "task", userId })
          .project({ type: 0 })
          .toArray();

        return {
          ...goal,
          tasks,
        };
      })
    );

    console.log(`✅ ${goalsWithTasks.length} Ziele geladen für userId=${userId}`);
    console.log("Ziele:", JSON.stringify(goalsWithTasks, null, 2));

    return res.status(200).json({ goals: goalsWithTasks });
  } catch (error) {
    console.error("❌ Fehler bei getGoals:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
