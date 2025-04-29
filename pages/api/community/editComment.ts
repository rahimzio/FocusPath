// pages/api/community/editComment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, commentId, userId, newContent } = req.body;

    if (!postId || !commentId || !userId || !newContent) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("community").updateOne(
      { _id: new ObjectId(postId), "comments._id": commentId, "comments.userId": userId },
      {
        $set: {
          "comments.$.comment": newContent,
          "comments.$.updatedAt": new Date().toISOString(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Comment not found or not authorized" });
    }

    return res.status(200).json({ message: "Comment updated" });
  } catch (error) {
    console.error("Error editing comment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
