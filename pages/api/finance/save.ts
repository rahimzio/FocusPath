import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';
import { expense } from '@/utils/interface';

const saveExpense = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, amount, category, frequency, dueDate }: expense = req.body; // Verwende das Expense Interface für die Validierung

  if (!name || !amount || !category || !frequency || !dueDate) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('expenses'); // 'expenses' Sammlung

    // Neue Ausgabe erstellen
    const newExpense: expense = {
      name,
      amount,
      category,
      frequency,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await collection?.insertOne(newExpense);

    if (result?.insertedId) {
      res.status(200).json({ message: 'Expense saved successfully', expenseId: result.insertedId });
    } else {
      res.status(500).json({ message: 'Failed to save expense' });
    }
  } catch (error) {
    console.error('Error saving expense:', error);
    res.status(500).json({ message: 'Error saving expense' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default saveExpense;