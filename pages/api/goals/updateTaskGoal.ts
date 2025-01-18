// pages/api/task/updateTaskAndGoalProgress.ts (Beispielname anpassen)

import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // taskId und neuer Status kommen aus dem Body
  const { taskId, status } = req.body;

  if (!taskId || !status) {
    return res.status(400).json({ message: "Fehlende taskId oder Status" });
  }

  try {
    // DB-Verbindung
    const { db } = await connectToDatabase();
    const tasksCollection = db.collection("tasks");
    const goalsCollection = db.collection("goals");

    // 1) Aufgabe aktualisieren
    const updateResult = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { status } }
    );

    if (updateResult.modifiedCount !== 1) {
      // Nichts aktualisiert -> Aufgabe nicht gefunden
      await disconnectFromDatabase();
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }

    // 2) Aktualisierte Aufgabe noch einmal holen
    const updatedTask = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
    if (!updatedTask) {
      // Sollte eigentlich nicht vorkommen, aber nur zur Sicherheit
      await disconnectFromDatabase();
      return res.status(404).json({ message: "Aufgabe nicht gefunden (nach Update)" });
    }

    // 3) Wenn Aufgabe ein goalId hat -> Fortschritt des Ziels updaten
    if (updatedTask.goalId) {
      // Ziel dokument holen
      const goalDoc = await goalsCollection.findOne({ _id: new ObjectId(updatedTask.goalId) });
      if (goalDoc) {
        // Alle Aufgaben für dieses Ziel
        const tasksForGoal = await tasksCollection
          .find({ goalId: updatedTask.goalId })
          .toArray();

        // completed / total
        const totalTasks = tasksForGoal.length;
        const completedTasks = tasksForGoal.filter((t) => t.status === "completed").length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Ziel-Fortschritt setzen
        await goalsCollection.updateOne(
          { _id: new ObjectId(updatedTask.goalId) },
          { $set: { progress } }
        );
      }
    }

    // Verbindung schließen und Erfolg melden
    await disconnectFromDatabase();
    return res
      .status(200)
      .json({ message: "Aufgabe erfolgreich aktualisiert und Ziel-Fortschritt berechnet" });

  } catch (error) {
    console.error("Fehler beim Aktualisieren der Aufgabe:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren der Aufgabe" });
  }
}
