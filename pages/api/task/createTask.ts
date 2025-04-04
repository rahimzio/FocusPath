import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { TaskDocument, CreateTaskBody, GoalDocument, SubTask } from "@/utils/interface";
import { v4 as uuidv4 } from "uuid"; // Für eindeutige Subtask-IDs

// Funktion zur Überprüfung einer gültigen ObjectId
function isValidObjectId(id: string | undefined): boolean {
  if (!id) return false;
  return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("REQUEST received:", req.method, req.url);

  if (req.method !== "POST") {
    console.log("Nicht erlaubte Methode:", req.method);
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("Request body:", req.body);
  const {
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
  } = req.body as CreateTaskBody;

  console.log("Extrahierte Felder:", { name, description, points, dueDate, frequency, category, goalId, subTasks,color,duration });

  if (!name || !description || !points || !dueDate || !frequency || !category) {
    console.log("Validierungsfehler: Nicht alle erforderlichen Felder wurden übergeben.");
    return res.status(400).json({ message: "Ungültige Anfrage, alle Felder müssen ausgefüllt sein!" });
  }

  try {
    console.log("Versuche, eine DB-Verbindung herzustellen...");
    const { db } = await connectToDatabase();
    console.log("DB-Verbindung hergestellt.");

    const tasksCollection = db.collection<TaskDocument>("tasks");
    const goalsCollection = db.collection<GoalDocument>("goals");

    console.log("Bereite Subtasks vor...");
    const formattedSubTasks: SubTask[] = (subTasks || []).map((subTask) => ({
      _id: uuidv4(),
      name: subTask.name,
      description: subTask.description || "",
      status: "incomplete" as "incomplete",
      points: subTask.points || 0,
      dueDate: subTask.dueDate || dueDate,
      time: subTask.time || "",
    }));
    console.log("Alle formatierten Subtasks:", formattedSubTasks);

    // goalId soll nur string oder undefined sein, kein null
    // Wir ermitteln ein validGoalId, das entweder goalId oder undefined ist.
    const validGoalId = goalId && isValidObjectId(goalId) ? goalId : undefined;

    const newTaskForDB: Omit<TaskDocument, "_id"> = {
      name,
      description,
      points,
      status: status || "incomplete",
      dueDate,
      frequency,
      category,
      linkedApps: linkedApps || [],
      timebased: !!timebased,
      time: time || "",
      goalId: validGoalId, // string | undefined
      progress: 0,
      subTasks: formattedSubTasks,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color,
      duration
    };
    console.log("Neues Task-Dokument (für DB):", newTaskForDB);

    console.log("Füge neuen Task in die DB ein...");
    const result = await tasksCollection.insertOne(newTaskForDB);
    console.log("Ergebnis des Insert:", result);

    // Nur updaten, wenn validGoalId wirklich vorhanden ist
    if (result.insertedId && validGoalId) {
      console.log(`Füge Task ${result.insertedId.toString()} zum Ziel ${validGoalId} hinzu...`);
      const updateResult = await goalsCollection.updateOne(
        { _id: new ObjectId(validGoalId) },
        {
          $push: { tasks: result.insertedId.toString() },
          $currentDate: { updatedAt: { $type: "date" } }
        }
      );
      console.log("Ergebnis des Ziel-Updates:", updateResult);
    } else {
      console.error(`Kein gültiges goalId vorhanden: ${goalId}`);
    }

    console.log("Aufgabe erfolgreich erstellt.");
    return res.status(201).json({
      message: "Aufgabe erfolgreich erstellt",
      taskId: result.insertedId,
      subTasks: formattedSubTasks
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    return res.status(500).json({ message: "Fehler beim Erstellen der Aufgabe" });
  } finally {
    console.log("DB-Verbindung bleibt offen, um den Connection-Pool zu nutzen.");
  }
}
