import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { UserAccount } from "@/utils/interface";
import { getCached, setCached } from "@/utils/redis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  const cacheKey = `account:${userId}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.status(200).json({ account: cached, cached: true });
  }

  const { db } = await connectToDatabase();
  const collection = db.collection<UserAccount>("user_accounts");
  const account = await collection.findOne({ userId });
  if (!account) return res.status(404).json({ message: "not found" });

  await setCached(cacheKey, account, 60);
  return res.status(200).json({ account, cached: false });
}