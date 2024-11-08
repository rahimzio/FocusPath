// Backend: API-Handler anpassen für Debugging
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name'); // DB-Verbindung

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('tasks'); // Greife auf die 'tasks' Sammlung zu

    // Abfrage der Daten
    const tasks = await collection?.find({}).toArray();

    // Debugging-Ausgabe: Überprüfen der Datenstruktur
    console.log("Tasks from DB:", tasks);

    if (tasks) {
      const structuredTasks = {
        dailyTasks: tasks.filter(task => task.frequency === 'daily'),
        weeklyGoals: tasks.filter(task => task.frequency === 'weekly'),
        monthlyGoals: tasks.filter(task => task.frequency === 'monthly'),
        yearlyGoals: tasks.filter(task => task.frequency === 'yearly'),
      };

      console.log("Structured Tasks:", structuredTasks); // Debugging-Ausgabe

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
