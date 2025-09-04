import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { db } = await connectToDatabase();
  const users = db.collection("users");

  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Missing or invalid userId" });
    }

    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { categories: 1 } }
    );

    return res.status(200).json({ categories: user?.categories || [] });
  }

  if (req.method === "POST") {
    const { userId, categoryName } = req.body as {
      userId?: string;
      categoryName?: string;
    };

    const name = categoryName?.trim();
    if (!userId || !name) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { categories: 1 } }
    );

    const categories: string[] = user?.categories || [];
    if (categories.find((c) => c.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ message: "Duplicate category" });
    }

    if (categories.length >= 20) {
      return res.status(400).json({ message: "Maximum categories reached" });
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: { categories: name },
        $setOnInsert: { createdAt: new Date().toISOString() },
      },
      { upsert: true }
    );

    return res.status(200).json({ message: "added" });
  }

  if (req.method === "PUT") {
    const { userId, oldName, newName } = req.body as {
      userId?: string;
      oldName?: string;
      newName?: string;
    };

    const name = newName?.trim();
    if (!userId || !oldName || !name) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const result = await users.updateOne(
      { _id: new ObjectId(userId), categories: oldName },
      { $set: { "categories.$": name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ message: "updated" });
  }

  if (req.method === "DELETE") {
    const { userId, categoryName } = req.body as {
      userId?: string;
      categoryName?: string;
    };

    if (!userId || !categoryName) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { categories: categoryName } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(200).json({ message: "deleted" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
