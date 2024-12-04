import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import MongoDB from '../db/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { taskId } = req.query; // taskId aus der URL (query)
  const updatedTask = req.body; // Alle aktualisierten Task-Daten aus dem Body

  if (req.method === 'PUT') {
    if (!taskId || !updatedTask) {
      return res.status(400).json({ message: 'Fehlende taskId oder Task-Daten' });
    }

    if (!ObjectId.isValid(taskId as string)) {
      return res.status(400).json({ message: 'Ungültige taskId' });
    }

    const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

    try {
      await mongoDB.getDbConnectionPromise();
      const collection = mongoDB.db?.collection('tasks');

      const result = await collection?.updateOne(
        { _id: new ObjectId(taskId as string) }, // taskId als ObjectId
        { $set: updatedTask } // Alle Felder der Aufgabe werden aktualisiert
      );

      if (result?.modifiedCount === 1) {
        return res.status(200).json({ message: 'Aufgabe erfolgreich aktualisiert' });
      } else {
        return res.status(404).json({ message: 'Aufgabe nicht gefunden' });
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Aufgabe:', error);
      res.status(500).json({ message: 'Fehler beim Aktualisieren der Aufgabe' });
    }
  } else if (req.method === 'DELETE') {
    if (!taskId) {
      return res.status(400).json({ message: 'Fehlende taskId' });
    }

    if (!ObjectId.isValid(taskId as string)) {
      return res.status(400).json({ message: 'Ungültige taskId' });
    }

    const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

    try {
      await mongoDB.getDbConnectionPromise();
      const collection = mongoDB.db?.collection('tasks');

      const result = await collection?.deleteOne({ _id: new ObjectId(taskId as string) });

      if (result?.deletedCount === 1) {
        return res.status(200).json({ message: 'Aufgabe erfolgreich gelöscht' });
      } else {
        return res.status(404).json({ message: 'Aufgabe nicht gefunden' });
      }
    } catch (error) {
      console.error('Fehler beim Löschen der Aufgabe:', error);
      res.status(500).json({ message: 'Fehler beim Löschen der Aufgabe' });
    }
  } else {
    res.status(405).json({ message: 'Methode nicht erlaubt' });
  }
}
