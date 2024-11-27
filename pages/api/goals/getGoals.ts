// /api/goals/getGoals.ts
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const getGoals = async (req: NextApiRequest, res: NextApiResponse) => {
  const { timeframe } = req.query; // Zeitrahmen: "weekly", "monthly", "yearly"

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('goals'); // Greife auf die 'goals' Sammlung zu

    // Dynamische Abfrage je nach Zeitrahmen
    let goals;
    if (timeframe === 'weekly') {
      goals = await collection?.find({ frequency: 'weekly' }).toArray();
    } else if (timeframe === 'monthly') {
      goals = await collection?.find({ frequency: 'monthly' }).toArray();
    } else if (timeframe === 'yearly') {
      goals = await collection?.find({ frequency: 'yearly' }).toArray();
    } else {
      return res.status(400).json({ message: 'Invalid timeframe' });
    }

    res.status(200).json({ goals });
  } catch (error) {
    console.error('Error retrieving goals:', error);
    res.status(500).json({ message: 'Error retrieving goals' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default getGoals;
