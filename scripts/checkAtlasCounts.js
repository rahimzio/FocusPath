import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = "mongodb+srv://rahimzio11_db_user:yoZxnKUaAUOZPyAu@focuspath.azcwx0v.mongodb.net/?appName=focuspath";
if (!uri) throw new Error("MONGODB_URI missing");

async function run() {
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db("focusPath");
  const cols = await db.listCollections().toArray();

  console.log("Collections:", cols.map(c => c.name));

  for (const c of cols) {
    const n = await db.collection(c.name).countDocuments();
    console.log(`${c.name}: ${n}`);
  }

  await client.close();
  console.log("✅ Done");
}

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
