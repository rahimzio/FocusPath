const express = require('express');
const app = express();
const { CosmosClient } = require('@azure/cosmos');

// Azure Cosmos DB Setup
const client = new CosmosClient({ endpoint: process.env.AZURE_COSMOS_CONNECTION_STRING, key: process.env.COSMOS_KEY });
const database = client.database('appDatabase');
const container = database.container('tasksContainer');

// Middleware
app.use(express.json());

// GET Route: Abrufen aller Aufgaben für einen Nutzer
app.get('/api/tasks/:userId', async (req, res) => {
  const { userId } = req.params;
  const { resources: tasks } = await container.items
    .query(`SELECT * FROM c WHERE c.userId = @userId`, { parameters: [{ name: '@userId', value: userId }] })
    .fetchAll();
  res.status(200).json(tasks);
});

// POST Route: Neue Aufgabe erstellen
app.post('/api/tasks', async (req, res) => {
  const task = req.body;
  await container.items.create(task);
  res.status(201).send('Task created successfully');
});

// PUT Route: Aufgabe aktualisieren
app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const updatedTask = req.body;
  await container.item(id).replace(updatedTask);
  res.status(200).send('Task updated successfully');
});

app.listen(3000, () => console.log('Server is running on port 3000'));
