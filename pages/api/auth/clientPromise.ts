import { MongoClient } from "mongodb";

const uri = process.env.COSMOS_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// ✅ Type-Erweiterung für globalThis
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.COSMOS_URI) {
  throw new Error("❌ MONGODB_URI ist nicht gesetzt");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
