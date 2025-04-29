import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { CreateTaskBody, SubTask } from "@/utils/interface";
import { v4 as uuidv4 } from "uuid";

function isValidObjectId(id: string | undefined): boolean {
  return !!id && ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const {
    userId,
    name,
    description,
    points,
    status,
    dueDate,
    frequency,
    category,
    linkedApps,
    timebased,
    time,
    goalId,
    subTasks,
    color,
    duration
  } = req.body as CreateTaskBody & { userId: string };

  if (!userId || !name || !description || !points || !dueDate || !frequency || !category) {
    return res.status(400).json({ message: "Pflichtfelder fehlen (inkl. userId)." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const formattedSubTasks: SubTask[] = (subTasks || []).map((subTask) => ({
      _id: uuidv4(),
      name: subTask.name,
      description: subTask.description || "",
      status: "incomplete",
      points: subTask.points || 0,
      dueDate: subTask.dueDate || dueDate,
      time: subTask.time || "",
      showInDaily: subTask.showInDaily || false,
    }));

    const validGoalId = goalId && isValidObjectId(goalId) ? goalId : undefined;

    const newTaskDoc = {
      type: "task",
      userId,
      name,
      description: description || "",
      points,
      status: status || "incomplete",
      dueDate,
      frequency,
      category,
      linkedApps: linkedApps || [],
      timebased: !!timebased,
      time: time || "",
      goalId: validGoalId,
      progress: 0,
      subTasks: formattedSubTasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color,
      duration,
    };

    const result = await appData.insertOne(newTaskDoc);

    if (result.insertedId && validGoalId) {
      await appData.updateOne(
        { _id: new ObjectId(validGoalId), type: "goal", userId },
        {
          $push: {
            tasks: { $each: [result.insertedId.toString()] }
          } as any, // ← hier wird TypeScript umgangen, weil du es garantiert weißt
          $currentDate: { updatedAt: true }
        }
      );      
    }

    return res.status(201).json({
      message: "Aufgabe erfolgreich erstellt",
      taskId: result.insertedId,
      subTasks: formattedSubTasks
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    return res.status(500).json({ message: "Serverfehler beim Erstellen der Aufgabe" });
  }
}
