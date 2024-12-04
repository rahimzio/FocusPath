import { NextApiRequest, NextApiResponse } from "next";
import MongoDB from "../db/mongo";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, description, points, status, dueDate, frequency, category, linkedApps, timebased, time } = req.body;

  if (!name || !description || !points || !dueDate || !frequency || !category) {
    return res.status(400).json({ message: "Ungültige Anfrage, alle Felder müssen ausgefüllt sein!" });
  }

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, "your-database-name");

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection("tasks");

    const newTask = {
      name,
      description,
      points,
      status,
      dueDate,
      frequency, // Hier wird "once", "daily", "weekly", etc. gesetzt
      category,
      linkedApps,
      timebased,
      time, // Die Uhrzeit, wenn zeitbasiert
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection?.insertOne(newTask);
    if (result?.insertedId) {
      res.status(201).json({ message: "Aufgabe erfolgreich erstellt", taskId: result.insertedId });
    } else {
      res.status(500).json({ message: "Fehler beim Erstellen der Aufgabe" });
    }
  } catch (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    res.status(500).json({ message: "Fehler beim Erstellen der Aufgabe" });
  } finally {
    await mongoDB.disconnect();
  }
};

export default handler;
