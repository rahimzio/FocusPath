import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI as string;
const MONGODB_DB = (process.env.MONGODB_DB as string) || "focuspath";
const COLLECTION = "tradingAccounts";

if (!MONGODB_URI) {
  throw new Error("Missing env MONGODB_URI");
}

async function getDb() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global._mongoClientPromise = client.connect();
  }
  const client = await global._mongoClientPromise;
  return client.db(MONGODB_DB);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ accounts: [] }, { status: 200 });
    }

    const db = await getDb();
    const accounts = await db
      .collection(COLLECTION)
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Failed to list accounts" },
      { status: 500 }
    );
  }
}
