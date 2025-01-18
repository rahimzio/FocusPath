// db/mongo.ts
import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

const DB_NAME = "your-database-name"; // Ggf. anpassen

export async function connectToDatabase() {
  if (client && db) {
    // bereits verbunden
    return { client, db };
  }

  try {
    const uri = process.env.AZURE_COSMOS_CONNECTION_STRING;
    if (!uri) {
      throw new Error("AZURE_COSMOS_CONNECTION_STRING nicht gesetzt!");
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db(DB_NAME);

    console.log("Mit MongoDB (Cosmos) verbunden.");
    return { client, db };
  } catch (error) {
    console.error("Fehler beim Verbinden zur MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("Verbindung zur MongoDB geschlossen.");
  }
}
