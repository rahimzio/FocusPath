// pages/api/community/voteComment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, commentId, userId, voteType } = req.body;

    if (!postId || !commentId || !userId || !["upvote", "downvote"].includes(voteType)) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }

    const { db } = await connectToDatabase();

    // Erst Downvote und Upvote-Arrays bereinigen
    const unsetResult = await db.collection("community").updateOne(
      { _id: new ObjectId(postId), "comments._id": commentId },
      {
        $pull: {
          "comments.$.upvotes": userId,
          "comments.$.downvotes": userId,
        },
      }
    );

    if (unsetResult.matchedCount === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Dann den neuen Vote setzen
    const voteField = voteType === "upvote" ? "comments.$.upvotes" : "comments.$.downvotes";

    const voteResult = await db.collection("communityPosts").updateOne(
      { _id: new ObjectId(postId), "comments._id": commentId },
      {
        $addToSet: { [voteField]: userId },
      }
    );

    return res.status(200).json({ message: `Comment ${voteType}d` });
  } catch (error) {
    console.error("Error voting comment:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
