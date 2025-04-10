import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { title, description, type, startDate, endDate, tasks = [], userId } = req.body;

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
      _id: goalId, // Mongo ObjectId für DB
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
      tasks: []
    };

    // 1. Ziel speichern
    await appData.insertOne(goalDoc);

    // 2. Tasks vorbereiten
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

    // 3. Tasks speichern
    if (preparedTasks.length > 0) {
      await appData.insertMany(preparedTasks);

      // 4. Ziel aktualisieren mit Task-Referenzen
      const taskIds = preparedTasks.map((t) => t._id.toHexString());
      await appData.updateOne(
        { _id: goalId, type: "goal", userId },
        { $set: { tasks: taskIds, updatedAt: new Date().toISOString() } }
      );
    }

    console.log(`✅ Neues Ziel erstellt: ${goalId}`);
    return res.status(201).json({ message: "Ziel erfolgreich erstellt", goalId: goalId.toHexString() });
  } catch (error) {
    console.error("❌ Fehler beim Erstellen des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}