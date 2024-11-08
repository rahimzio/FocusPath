import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb'; 
import MongoDB from '../../db/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'PUT') {
    const { taskId } = req.query; // taskId aus der URL (query)
    const { status } = req.body;  // Status aus dem Request-Body

    // Überprüfe, ob taskId und status vorhanden sind
    if (!taskId || !status) {
      return res.status(400).json({ message: 'Fehlende taskId oder Status' });
    }

    // Überprüfen, ob die taskId eine gültige MongoDB ObjectId ist
    if (!ObjectId.isValid(taskId as string)) {
      return res.status(400).json({ message: 'Ungültige taskId' });
    }

    const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');
    
    try {
      // Verbindung zur DB herstellen
      await mongoDB.getDbConnectionPromise();
      
      // Wandelt taskId in ObjectId um
      const objectId = new ObjectId(taskId as string);

      // Aufgabe in der Datenbank finden und den Status aktualisieren
      const result = await mongoDB.db?.collection('tasks').updateOne(
        { _id: objectId }, // Suche nach der Aufgabe anhand der ObjectId
        { $set: { status: status } } // Setze den neuen Status
      );

      // Überprüfen, ob die Aufgabe gefunden und aktualisiert wurde
      if (result && result.modifiedCount > 0) {
        return res.status(200).json({ message: 'Status erfolgreich aktualisiert' });
      } else {
        return res.status(404).json({ message: 'Aufgabe nicht gefunden oder Status unverändert' });
      }

    } catch (error: unknown) {
      // Fehler als any typisieren, um auf message zuzugreifen
      if (error instanceof Error) {
        console.error('Fehler beim Aktualisieren des Aufgabenstatus:', error.message);
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Aufgabe', error: error.message });
      } else {
        console.error('Unbekannter Fehler:', error);
        res.status(500).json({ message: 'Unbekannter Fehler beim Aktualisieren der Aufgabe' });
      }
    } finally {
      // Stelle sicher, dass die DB-Verbindung getrennt wird
      await mongoDB.disconnect();
    }
  } else {
    res.status(405).json({ message: 'Methode nicht erlaubt' });
  }
}
