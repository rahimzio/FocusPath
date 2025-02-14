import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo"; // ❌ disconnectFromDatabase entfernt
import { Task, Completion } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ message: "Missing or invalid 'date' parameter" });
  }

  try {
    console.log("🟢 API getTasks wurde aufgerufen mit Datum:", date);
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");
    const completionsColl = db.collection<Completion>("completions");

    // 1) Lade nur relevante Felder der Tasks
    const allTasks = await tasksColl.find({}, { projection: { _id: 1, name: 1, dueDate: 1, frequency: 1 } }).toArray();
    console.log("📌 Geladene Tasks:", allTasks.length);

    // 2) Lade Completions für dieses Datum
    const allCompletions = await completionsColl.find({ date }).toArray();
    console.log("📌 Geladene Completions:", allCompletions.length);

    // 3) Frequenz-Filter: Welche Tasks sind heute "relevant"?
    const selectedDate = new Date(date);
    const relevantTasks = allTasks.filter((task) => {
      const isRelevant = checkFrequency(task, selectedDate);
      console.log(`🔍 Prüfung Task ${task.name}:`, isRelevant);
      return isRelevant;
    });

    console.log("📌 Relevante Tasks für", date, ":", relevantTasks.length);

    // 4) Completions mit Tasks verknüpfen
    const tasksWithStatus = relevantTasks.map((task) => {
      const taskIdStr = task._id?.toString();
      const completion = allCompletions.find((c) => c.taskId === taskIdStr);
      const status = completion?.status === "completed" ? "completed" : "incomplete";
      return { ...task, status };
    });

    console.log("✅ Tasks mit Status geladen:", tasksWithStatus.length);
    
    return res.status(200).json({ tasks: tasksWithStatus });

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Aufgaben:", error);
    return res.status(500).json({ message: "Fehler beim Abrufen der Aufgaben", error: error });
  }
}

// Wiederholungslogik (unverändert)
function checkFrequency(task: Task, selectedDate: Date): boolean {
  const dueDate = new Date(task.dueDate);
  const diff = dayDiff(dueDate, selectedDate);
  if (diff < 0) return false;

  switch (task.frequency) {
    case "once": return isSameDay(dueDate, selectedDate);
    case "daily": return true;
    case "weekly": return diff % 7 === 0;
    case "monthly": return selectedDate.getDate() === dueDate.getDate();
    case "yearly": return selectedDate.getMonth() === dueDate.getMonth() && selectedDate.getDate() === dueDate.getDate();
    default: return false;
  }
}

function dayDiff(a: Date, b: Date): number {
  return Math.floor((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - 
                     Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 
                     (24 * 60 * 60 * 1000));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
