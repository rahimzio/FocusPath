// /api/goals/addGoal.ts
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const addGoal = async (req: NextApiRequest, res: NextApiResponse) => {
  const { title, description, frequency } = req.body; // Eingaben für Ziele

  if (!title || !description || !frequency) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('goals'); // Greife auf die 'goals' Sammlung zu

    // Neues Ziel speichern
    const newGoal = {
      title,
      description,
      frequency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection?.insertOne(newGoal);

    if (result?.insertedId) {
      res.status(200).json({ message: 'Goal added successfully', goalId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to add goal' });
    }
  } catch (error) {
    console.error('Error adding goal:', error);
    res.status(500).json({ message: 'Error adding goal' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default addGoal;
