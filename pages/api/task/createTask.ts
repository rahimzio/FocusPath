// pages/api/task/createTask.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Task } from "@/utils/interface";
import { Collection } from "mongodb";

// optional: Du kannst hier `ObjectId` importieren, falls du manuell _id setzen willst
// import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
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
      duration,
      goalId,
    } = req.body;

    // Felder validieren (Minimalbeispiel)
    if (!name || !description || points === undefined || !dueDate || !frequency || !category) {
      return res.status(400).json({ message: "Fehlende Pflichtfelder." });
    }

    const { db } = await connectToDatabase();
    const collection: Collection<Task> = db.collection("tasks");

    // Task-Objekt ohne _id => MongoDB generiert es
    const newTask: Omit<Task, "_id"> = {
      
      name,
      description,
      points: Number(points),
      status: status || "incomplete",
      dueDate,
      frequency,
      category,
      linkedApps: linkedApps || [],
      timebased: !!timebased,
      time: time || "",
      duration: duration,
      goalId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // id: "" -> du kannst 'id' weglassen, da _id von Mongo kommt
    };

    const result = await collection.insertOne(newTask);
    await disconnectFromDatabase();

    return res.status(201).json({
      message: "Aufgabe erfolgreich erstellt",
      // Hier geben wir nur taskId zurück (ObjectId)
      taskId: result.insertedId,
    });
  } catch (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
}