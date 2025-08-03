import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Account } from "@/utils/interface";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") return res.status(405).json({ message: "Method not allowed" });

  const { id, ...rest } = req.body as { id?: string } & Partial<Account>;
  if (!id) {
    return res.status(400).json({ message: "Missing id" });
  }

  const updateData = rest;

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<Account>("trading");
    const result = await collection.updateOne(
      { _id: new ObjectId(id) as any},
      { $set: { ...updateData, updatedAt: new Date().toISOString() } }
    );
    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Account not found" });
    }
    return res.status(200).json({ message: "updated" });
  } catch (err) {
    console.error("update account error", err);
    return res.status(500).json({ message: "server error" });
  }
}