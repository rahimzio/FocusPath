// pages/api/goal/createGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase} from "../db/mongo";
import { Goal, Task } from "@/utils/interface";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { title, description, type, startDate, endDate, tasks = [] } = req.body;

  if (!title || !type || !startDate || !endDate) {
    return res.status(400).json({
      message: "Missing required fields: 'title', 'type', 'startDate', or 'endDate'.",
    });
  }

  try {
    const { db } = await connectToDatabase();

    // Ziele-Collection prüfen
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const goalsExists = collections.some((col) => col.name === "goals");
    const tasksExists = collections.some((col) => col.name === "tasks");

    if (!goalsExists || !tasksExists) {
      return res.status(500).json({
        message: "Collection 'goals' oder 'tasks' fehlt. Bitte manuell in CosmosDB anlegen.",
      });
    }

    const goalsColl = db.collection<Goal>("goals");
    const tasksColl = db.collection<Task>("tasks");

    // Neues Ziel anlegen
    const goalId = new ObjectId();
    const createdAt = new Date().toISOString();

    const newGoal: Goal = {
      _id: goalId.toHexString(),
      title,
      description,
      type,
      startDate,
      endDate,
      progress: 0,
      tasks: [],
      subGoals: [],
      createdAt,
      updatedAt: createdAt,
    };

    const goalResult = await goalsColl.insertOne(newGoal);

    if (!goalResult.acknowledged) {
      throw new Error("Ziel konnte nicht eingefügt werden");
    }

    // Aufgaben vorbereiten mit goalId und eigener _id
    const preparedTasks = tasks.map((task: any) => {
      const taskId = new ObjectId();
      return {
        ...task,
        _id: taskId,
        goalId: goalId.toHexString(),
        status: "incomplete",
        createdAt,
        updatedAt: createdAt,
      };
    });

    if (preparedTasks.length > 0) {
      // Tasks einfügen
      await tasksColl.insertMany(preparedTasks);

      // goal.tasks[] mit Task-IDs aktualisieren
      const taskIds = preparedTasks.map((t) => t._id.toHexString());
      await goalsColl.updateOne(
        { _id: goalId.toHexString() },
        { $set: { tasks: taskIds } }
      );
    }

    console.log(`✅ Neues Ziel erstellt: ${goalId}`);
    return res.status(201).json({ message: "Ziel erfolgreich erstellt", goalId: goalId });
  } catch (error: any) {
    console.error("❌ Fehler beim Erstellen des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
