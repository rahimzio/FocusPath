import type { NextApiRequest, NextApiResponse } from 'next';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../db/mongo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Methode nicht erlaubt' });
  }

  const { taskId } = req.query;
  const { status } = req.body;

  if (!taskId || !status) {
    return res.status(400).json({ message: 'Fehlende taskId oder Status' });
  }

  if (!ObjectId.isValid(taskId as string)) {
    return res.status(400).json({ message: 'Ungültige taskId' });
  }

  try {
    const { db } = await connectToDatabase();
    const objectId = new ObjectId(taskId as string);

    const result = await db.collection('tasks').updateOne(
      { _id: objectId },
      { $set: { status } }
    );

    if (result.modifiedCount > 0) {
      return res.status(200).json({ message: 'Status erfolgreich aktualisiert' });
    } else {
      return res.status(404).json({ message: 'Aufgabe nicht gefunden oder Status unverändert' });
    }

  } catch (error: any) {
    console.error('Fehler beim Aktualisieren des Aufgabenstatus:', error);
    return res.status(500).json({
      message: 'Fehler beim Aktualisieren der Aufgabe',
      error: error?.message || 'Unbekannter Fehler',
    });
  }
}
