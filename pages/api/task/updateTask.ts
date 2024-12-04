import { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import MongoDB from '../db/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { taskId } = req.query;
  const updatedTask = req.body;

  // Loggen Sie die eingehenden Daten für Debugging
  console.log('Aktualisiere Aufgabe mit taskId:', taskId);
  console.log('Daten der Aufgabe:', updatedTask);

  if (req.method === 'PUT') {
    if (!taskId || !updatedTask) {
      console.error("Fehlende taskId oder Task-Daten");
      return res.status(400).json({ message: 'Fehlende taskId oder Task-Daten' });
    }

    if (!ObjectId.isValid(taskId as string)) {
      console.error('Ungültige taskId');
      return res.status(400).json({ message: 'Ungültige taskId' });
    }

    const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

    try {
      await mongoDB.getDbConnectionPromise();
      const collection = mongoDB.db?.collection('tasks');

      // Entferne das '_id'-Feld aus 'updatedTask'
      delete updatedTask._id;

      // Loggen Sie das Update
      console.log("Versuche, die Aufgabe zu aktualisieren:", taskId);

      const result = await collection?.updateOne(
        { _id: new ObjectId(taskId as string) }, // taskId als ObjectId
        { $set: updatedTask }
      );

      if (result?.modifiedCount === 1) {
        return res.status(200).json({ message: 'Aufgabe erfolgreich aktualisiert' });
      } else {
        console.error("Aufgabe nicht gefunden oder Status unverändert");
        return res.status(404).json({ message: 'Aufgabe nicht gefunden' });
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Aufgabe:', error);
      res.status(500).json({ message: 'Fehler beim Aktualisieren der Aufgabe' });
    }
  } else {
    console.error("Methode nicht erlaubt");
    res.status(405).json({ message: 'Methode nicht erlaubt' });
  }
}
