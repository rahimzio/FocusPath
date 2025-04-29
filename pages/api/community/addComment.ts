// pages/api/community/addComment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { Comment } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, userId, userEmail, comment } = req.body;

    if (!postId || !userId || !userEmail || !comment) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db } = await connectToDatabase();

    const newComment: Comment = {
      _id: new ObjectId(),
      userId,
      userEmail,
      comment,
      createdAt: new Date().toISOString(),
      upvotes: [],
      downvotes: [],
    };

    const result = await db.collection("community").updateOne(
      { _id: new ObjectId(postId), type: "userTopic" },
      { $push: { comments: newComment } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Post not found or not a userTopic" });
    }

    return res.status(200).json({ message: "Comment added", comment: newComment });
  } catch (error) {
    console.error("Error adding comment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}