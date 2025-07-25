import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/mongo';
import { expense } from '@/utils/interface';

const saveExpense = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, amount,note, category, frequency, dueDate }: expense = req.body;

  if (!name || !amount || !category || !frequency || !dueDate) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<expense>('expenses');

    const newExpense: expense = {
      name,
      amount,
      category,
      frequency,
      note,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.insertOne(newExpense);

    if (result.insertedId) {
      return res.status(200).json({ message: 'Expense saved successfully', expenseId: result.insertedId });
    } else {
      return res.status(500).json({ message: 'Failed to save expense' });
    }
  } catch (error) {
    console.error('Error saving expense:', error);
    return res.status(500).json({ message: 'Error saving expense' });
  }
};

export default saveExpense;
