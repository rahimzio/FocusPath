// Backend: API-Handler anpassen für Debugging
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('tasks');

    // Heutiges Datum
    const today = new Date().toISOString().split("T")[0];

    // Abfrage nach täglichen Aufgaben (daily) ohne Uhrzeit
    const tasks = await collection?.find({
      frequency: 'daily',
      $or: [
        { timebased: false },
        { timebased: true, dueDate: today }
      ]
    }).toArray();

    if (tasks) {
      const structuredTasks = {
        dailyTasks: tasks.filter(task => task.frequency === 'daily'),
        // Hier können auch wöchentliche, monatliche etc. Aufgaben gefiltert werden
      };

      res.status(200).json({ structuredKlonData: structuredTasks });
    } else {
      res.status(404).json({ message: 'Keine Aufgaben gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Aufgaben:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Aufgaben' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default handler;
