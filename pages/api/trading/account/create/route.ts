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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const userId = body?.userId as string | undefined;
    const payload = body?.payload ?? {};

    if (!userId) {
      return NextResponse.json({ message: "Missing userId" }, { status: 400 });
    }

    const name = String(payload?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ message: "Missing account name" }, { status: 400 });
    }

    const currency = String(payload?.currency ?? "USD").trim();
    const startCapital = Number(payload?.startCapital ?? 0) || 0;
    const riskPerTrade = Number(payload?.riskPerTrade ?? 0) || 0;

    const now = new Date();

    const doc = {
      userId,
      name,
      currency,
      startCapital,
      riskPerTrade,
      isActive: payload?.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    const res = await db.collection(COLLECTION).insertOne(doc);

    return NextResponse.json(
      { account: { ...doc, _id: res.insertedId } },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message ?? "Failed to create account" },
      { status: 500 }
    );
  }
}
