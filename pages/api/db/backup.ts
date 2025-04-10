import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

const COSMOS_URI = process.env.COSMOS_URI!;
const COSMOS_DB = process.env.COSMOS_DB!;
const ATLAS_URI = process.env.ATLAS_URI!;
const ATLAS_DB = process.env.ATLAS_DB!;

async function backupAppData() {
  const cosmosClient = new MongoClient(COSMOS_URI);
  const atlasClient = new MongoClient(ATLAS_URI);

  try {
    await cosmosClient.connect();
    await atlasClient.connect();

    const cosmosDb = cosmosClient.db(COSMOS_DB);
    const atlasDb = atlasClient.db(ATLAS_DB);

    const cosmosCollection = cosmosDb.collection("appData");
    const atlasCollection = atlasDb.collection("appData_backup");

    const allDocs = await cosmosCollection.find().toArray();
    console.log(`📦 Backup: ${allDocs.length} Dokumente geladen.`);

    await atlasCollection.deleteMany({});
    await atlasCollection.insertMany(allDocs);

    console.log("✅ Backup abgeschlossen und in Atlas gespeichert.");
  } catch (error) {
    console.error("❌ Backup fehlgeschlagen:", error);
  } finally {
    await cosmosClient.close();
    await atlasClient.close();
  }
}

export default backupAppData;
