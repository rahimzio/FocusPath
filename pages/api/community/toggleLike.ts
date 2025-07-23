import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, userEmail } = req.body;
    if (!postId || !userEmail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db } = await connectToDatabase();
    const post = await db.collection("community").findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ message: "Post not found" });

    let likes = post.likes || [];
    if (likes.includes(userEmail)) {
      likes = likes.filter((u: string) => u !== userEmail);
    } else {
      likes.push(userEmail);
    }

    await db.collection("community").updateOne({ _id: new ObjectId(postId) }, { $set: { likes } });

    return res.status(200).json({ likes });
  } catch (error) {
    console.error("Error toggling like:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}