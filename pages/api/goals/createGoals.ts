import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const {
    title,
    description,
    type,
    startDate,
    endDate,
    tasks = [],
    userId,
    parentGoalId,
    subGoals = [],
  } = req.body;

  if (!title || !type || !startDate || !endDate || !userId) {
    return res.status(400).json({
      message: "Missing required fields: 'title', 'type', 'startDate', 'endDate', or 'userId'.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const goalId = new ObjectId();
    const createdAt = new Date().toISOString();

    const goalDoc = {
      _id: goalId,
      type: "goal",
      userId,
      title,
      description,
      progress: 0,
      startDate,
      endDate,
      createdAt,
      updatedAt: createdAt,
      subGoals: [],
      parentGoalId: parentGoalId || null,
      tasks: []
    };

    await appData.insertOne(goalDoc);

    const preparedTasks = tasks.map((task: any) => {
      const taskId = new ObjectId();
      return {
        ...task,
        _id: taskId,
        type: "task",
        userId,
        goalId: goalId.toHexString(),
        status: "incomplete",
        createdAt,
        updatedAt: createdAt,
      };
    });

    if (preparedTasks.length > 0) {
      await appData.insertMany(preparedTasks);
      const taskIds = preparedTasks.map((t: { _id: { toHexString: () => any; }; }) => t._id.toHexString());
      await appData.updateOne(
        { _id: goalId, type: "goal", userId },
        { $set: { tasks: taskIds, updatedAt: new Date().toISOString() } }
      );
    }

    const subGoalIds: string[] = [];

    for (const sg of subGoals) {
      const subGoalId = new ObjectId();
      subGoalIds.push(subGoalId.toHexString());

      const subGoalDoc = {
        _id: subGoalId,
        type: "goal",
        userId,
        title: sg.title,
        description: sg.description || "",
        progress: 0,
        startDate: sg.startDate,
        endDate: sg.endDate,
        createdAt,
        updatedAt: createdAt,
        parentGoalId: goalId.toHexString(),
        subGoals: [],
        tasks: []
      };

      await appData.insertOne(subGoalDoc);
    }

    if (subGoalIds.length > 0) {
      await appData.updateOne(
        { _id: goalId },
        { $set: { subGoals: subGoalIds } }
      );
    }

    console.log(`✅ Ziel erstellt (ID: ${goalId}) mit ${preparedTasks.length} Aufgaben und ${subGoalIds.length} Unterzielen.`);

    return res.status(201).json({
      message: "Ziel erfolgreich erstellt",
      goalId: goalId.toHexString(),
    });
  } catch (error: any) {
    console.error("❌ Fehler beim Erstellen des Ziels:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message || error.toString(),
    });
  }
}
