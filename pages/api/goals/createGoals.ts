// api/goals/createGoal.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { GoalDocument, TaskDocument, CreateGoalBody } from "@/utils/interface";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("REQUEST received:", req.method, req.url);

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  console.log("Request body:", req.body);
  const {
    title,
    description,
    startDate,
    endDate,
    type,
    tasks,
    subGoals,
    weight,
    priority
  } = req.body as CreateGoalBody;

  if (!title || !startDate || !endDate || !type) {
    console.log("Validierungsfehler: Fehlende Pflichtfelder.");
    return res.status(400).json({ message: "Titel, Start- und Enddatum sowie Typ sind erforderlich." });
  }

  try {
    console.log("Verbinde zur Datenbank...");
    const { db } = await connectToDatabase();
    console.log("Datenbank verbunden.");

    const goalsCollection = db.collection<GoalDocument>("goals");
    const tasksCollection = db.collection<TaskDocument>("tasks");

    /* Erstellt das Hauptziel
    const newGoal: Omit<GoalDocument, "_id"> = {
      _id: new ObjectId(),
      title,
      description: description || "", // Falls description undefined ist, setzen wir ""
      startDate,
      endDate,
      type,
      progress: 0,
      tasks: [],
      subGoals: [],
      weight: weight || 1,
      priority: priority || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: ""
    };
    */
    const newGoal: GoalDocument = {
      _id: new ObjectId(),  // Hier die fehlende _id hinzufügen!
      title,
      description: description || "", 
      startDate,
      endDate,
      type,
      progress: 0,
      tasks: [],
      subGoals: [],
      weight: weight || 1,
      priority: priority || 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: ""
    };
    


    console.log("Speichere Hauptziel...");
    const goalResult = await goalsCollection.insertOne(newGoal);
    const goalId = goalResult.insertedId.toString();
    console.log("Hauptziel erstellt mit ID:", goalId);

    // Falls Aufgaben vorhanden sind, speichern und mit Ziel verknüpfen
    if (tasks && tasks.length > 0) {
      console.log("Erstelle zugehörige Aufgaben...");
      const taskDocs = tasks.map((task: any) => ({
        ...task,
        goalId,
        status: "incomplete",
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const taskResult = await tasksCollection.insertMany(taskDocs);
      const taskIds = Object.values(taskResult.insertedIds).map(id => id.toString());
      console.log("Aufgaben erstellt mit IDs:", taskIds);

      await goalsCollection.updateOne(
        { _id: new ObjectId(goalId) },
        { $set: { tasks: taskIds } }
      );
    }

    // Falls Unterziele vorhanden sind, speichern und mit Ziel verknüpfen
    if (subGoals && subGoals.length > 0) {
      console.log("Erstelle Unterziele...");
      const subGoalDocs = subGoals.map((subGoal: any) => ({
        ...subGoal,
        progress: 0,
        tasks: [],
        subGoals: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const subGoalResult = await goalsCollection.insertMany(subGoalDocs);
      const subGoalIds = Object.values(subGoalResult.insertedIds).map(id => id.toString());
      console.log("Unterziele erstellt mit IDs:", subGoalIds);

      await goalsCollection.updateOne(
        { _id: new ObjectId(goalId) },
        { $set: { subGoals: subGoalDocs } }
      );
    }

    console.log("Ziel erfolgreich erstellt.");
    return res.status(201).json({
      message: "Ziel erfolgreich erstellt",
      goalId,
      tasks: tasks?.length || 0,
      subGoals: subGoals?.length || 0,
    });
  } catch (error) {
    console.error("Fehler beim Erstellen des Ziels:", error);
    return res.status(500).json({ message: "Fehler beim Erstellen des Ziels" });
  }
}
