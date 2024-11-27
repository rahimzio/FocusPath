// /pages/api/tasks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { CosmosClient } from '@azure/cosmos';

const client = new CosmosClient({ endpoint: process.env.COSMOS_DB_ENDPOINT, key: process.env.COSMOS_DB_KEY });
const container = client.database('your-database-name').container('tasks');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dueDate } = req.query; // hole den dueDate-Parameter aus der URL

  try {
    const query = `SELECT * FROM c WHERE c.dueDate = @dueDate`; // SQL-Abfrage zum Filtern von Aufgaben nach Datum
    const { resources: tasks } = await container.items.query({
      query,
      parameters: [{ name: '@dueDate', value: dueDate }],
    }).fetchAll();

    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
}
