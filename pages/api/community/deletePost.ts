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

    const ADMIN_EMAILS = ["rahimzio11@gmail.com"];
    const normalizedEmail = (userEmail as string).toLowerCase();
    if (post.createdBy !== userEmail && !ADMIN_EMAILS.includes(normalizedEmail)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await db.collection("community").deleteOne({ _id: new ObjectId(postId) });
    return res.status(200).json({ message: "Post deleted" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}