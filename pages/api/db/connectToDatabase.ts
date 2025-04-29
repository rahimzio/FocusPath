import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const DB_NAME = "focusPath"; // Ggf. anpassen

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log("🔄 Verwende bestehende MongoDB-Verbindung.");
    return { client: cachedClient, db: cachedDb };
  }

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("❌ MONGODB_URI ist nicht gesetzt!");

    console.log("🔄 Stelle Verbindung zu MongoDB (Cosmos) her...");
    cachedClient = new MongoClient(uri, { maxPoolSize: 10 });
    await cachedClient.connect();
    cachedDb = cachedClient.db(DB_NAME);

    console.log("✅ Erfolgreich mit MongoDB (Cosmos) verbunden.");
    return { client: cachedClient, db: cachedDb };
  } catch (error) {
    console.error("❌ Fehler beim Verbinden zur MongoDB:", error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  console.log("⚠️ `disconnectFromDatabase()` wird nicht mehr automatisch aufgerufen.");
}
