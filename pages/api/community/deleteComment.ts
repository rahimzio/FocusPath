// pages/api/community/deleteComment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, commentId, userId } = req.body;

    if (!postId || !commentId || !userId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("community").updateOne(
      { _id: new ObjectId(postId), "comments._id": commentId, "comments.userId": userId },
      { $pull: { comments: { _id: commentId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    return res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
