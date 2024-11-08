// Backend API-Handler: /api/task/updateStatus/[taskId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { taskId } = req.query; // Extrahiere taskId aus der URL
  const { status } = req.body; // Status aus dem Request Body

  if (!taskId || !status) {
    return res.status(400).json({ message: 'Ungültige Anfrage' });
  }

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('tasks');

    // Aufgabe mit der gegebenen ID suchen und den Status aktualisieren
    const result = await collection?.updateOne(
      { id: taskId }, // Suchen nach der Aufgabe
      { $set: { status } } // Status aktualisieren
    );

    if (result?.modifiedCount === 1) {
      res.status(200).json({ message: 'Status erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Aufgabe nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default handler;
