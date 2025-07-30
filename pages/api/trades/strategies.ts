import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Strategy } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { db } = await connectToDatabase();
  const collection = db.collection<Strategy>("strategies");

  if (req.method === "GET") {
    const strategies = await collection.find().toArray();
    return res.status(200).json({ strategies });
  }

  if (req.method === "POST") {
    const { userId, name, description, tag_color } = req.body as Strategy;
    if (!userId || !name) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const result = await collection.insertOne({
      userId,
      name,
      description,
      tag_color,
      createdAt: new Date().toISOString(),
    });
    return res.status(201).json({ id: result.insertedId });
  }

  return res.status(405).json({ message: "Method not allowed" });
}