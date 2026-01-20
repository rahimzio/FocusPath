import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = "mongodb+srv://rahimzio11_db_user:yoZxnKUaAUOZPyAu@focuspath.azcwx0v.mongodb.net/?appName=focuspath";
console.log("MONGODB_URI:", process.env.MONGODB_URI);

async function run() {
  const client = new MongoClient(uri);
  await client.connect();

  // ping
  await client.db().command({ ping: 1 });
  console.log("✅ Connected + ping ok");

  // liste DBs (optional)
  // const dbs = await client.db().admin().listDatabases();
  // console.log(dbs.databases.map(d => d.name));

  await client.close();
}

run().catch((e) => {
  console.error("❌ Connection failed:", e);
  process.exit(1);
});
