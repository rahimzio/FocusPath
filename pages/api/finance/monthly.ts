// /api/expense/monthly.ts
import { NextApiRequest, NextApiResponse } from 'next';
import MongoDB from '../db/mongo';

const getMonthlyExpenses = async (req: NextApiRequest, res: NextApiResponse) => {
  const mongoDB = new MongoDB(process.env.AZURE_COSMOS_CONNECTION_STRING as string, 'your-database-name');

  try {
    await mongoDB.getDbConnectionPromise();
    const collection = mongoDB.db?.collection('expenses'); // Access the 'expenses' collection

    // Get expenses for the current month
    const currentMonth = new Date().getMonth();
    const expenses = await collection?.find({
      dueDate: {
        $gte: new Date(new Date().getFullYear(), currentMonth, 1).toISOString(),
        $lt: new Date(new Date().getFullYear(), currentMonth + 1, 1).toISOString(),
      },
    }).toArray();

    const totalExpenses = expenses?.reduce((acc, expense) => acc + expense.amount, 0);

    res.status(200).json({ expenses, totalExpenses }); // Return the expenses and total amount
  } catch (error) {
    console.error('Error retrieving monthly expenses:', error);
    res.status(500).json({ message: 'Error retrieving expenses' });
  } finally {
    await mongoDB.disconnect();
  }
};

export default getMonthlyExpenses;
