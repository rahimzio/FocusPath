import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/mongo';
import { expense } from '@/utils/interface';

const getMonthlyExpenses = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<expense>('expenses');

    const now = new Date();
    const currentMonth = now.getMonth();
    const start = new Date(now.getFullYear(), currentMonth, 1).toISOString();
    const end = new Date(now.getFullYear(), currentMonth + 1, 1).toISOString();

    const expenses = await collection
      .find({
        dueDate: { $gte: start, $lt: end },
      })
      .toArray();

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    return res.status(200).json({ expenses, totalExpenses });
  } catch (error) {
    console.error('Error retrieving monthly expenses:', error);
    return res.status(500).json({ message: 'Error retrieving expenses' });
  }
};

export default getMonthlyExpenses;
