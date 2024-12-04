import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';
import { ObjectId } from 'mongodb';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { taskId } = req.query; // taskId aus der URL (query)
  const { status } = req.body;  // Status aus dem Request-Body

  if (!taskId || !status) {
    return res.status(400).json({ message: 'Fehlende taskId oder Status' });
  }

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('tasks');

    // Aktualisiere den Status der Aufgabe
    const result = await collection?.updateOne(
      { _id: new ObjectId(taskId as string) },  // taskId als ObjectId
      { $set: { status } } // Status aktualisieren
    );

    if (result?.modifiedCount === 1) {
      return res.status(200).json({ message: 'Status erfolgreich aktualisiert' });
    } else {
      return res.status(404).json({ message: 'Aufgabe nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Status:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default handler;
