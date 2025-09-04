import { MongoClient, Db, Collection } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// DB-Name priorisieren: MONGODB_DB > AZURE_COSMOS_DB_NAME > fallback
const DB_NAME =
  process.env.MONGODB_DB ||
  process.env.AZURE_COSMOS_DB_NAME ||
  "focusPath";

// URI priorisieren: klassische Mongo-URI > Cosmos-URI
function getMongoUri(): string {
  const uri = process.env.MONGODB_URI || process.env.AZURE_COSMOS_CONNECTION_STRING;
  if (!uri) {
    throw new Error("❌ Weder MONGODB_URI noch AZURE_COSMOS_CONNECTION_STRING gesetzt!");
  }
  return uri;
}

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    // Reuse in Serverless / dev HMR
    console.log("🔄 Verwende bestehende MongoDB-Verbindung.");
    return { client: cachedClient, db: cachedDb };
  }

  const uri = getMongoUri();
  console.log("🔌 Stelle Verbindung zu MongoDB her …");
  cachedClient = new MongoClient(uri, { maxPoolSize: 10 });
  await cachedClient.connect();
  cachedDb = cachedClient.db(DB_NAME);
  console.log(`✅ Verbunden mit DB "${DB_NAME}".`);

  return { client: cachedClient, db: cachedDb };
}

// Bequemer Helper, wenn nur die Db gebraucht wird
export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

// Absichtlich kein Close in Next.js APIs
export async function disconnectFromDatabase() {
  console.log("⚠️ disconnectFromDatabase() ist ein No-Op (Next.js serverless).");
}
export async function getTradingCollection(db: Db): Promise<Collection> {
  // bevorzugter Name per ENV (optional), sonst "trading"
  const preferred = process.env.TRADING_COLLECTION?.trim() || "trading";
  const fallback  = process.env.TRADES_COLLECTION_FALLBACK?.trim() || "trading";

  // vorhandene Collections abfragen (billig & sicher; erzeugt nichts!)
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(x => x.name);
  const hasPreferred = names.includes(preferred);
  const hasFallback  = names.includes(fallback);

  if (hasPreferred) return db.collection(preferred);
  if (hasFallback)  return db.collection(fallback);

  // 👉 weder trading noch trades vorhanden: EXPLIZIT abbrechen,
  // damit Cosmos NICHT versucht, automatisch eine neue Collection anzulegen.
  throw new Error(
    `Keine geeignete Collection gefunden. Lege in Cosmos DB eine Collection ` +
    `"${preferred}" (oder "${fallback}") an, oder setze TRADING_COLLECTION/TRADES_COLLECTION_FALLBACK.`
  );
}