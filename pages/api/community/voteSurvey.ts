import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { postId, optionId, userEmail } = req.body;
    if (!postId || !optionId || !userEmail) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { db } = await connectToDatabase();
    const post = await db.collection("community").findOne({ _id: new ObjectId(postId), type: "survey" });
    if (!post) return res.status(404).json({ message: "Survey not found" });

    const options = post.options || [];
    for (const opt of options) {
      opt.votes = (opt.votes || []).filter((v: string) => v !== userEmail);
      if (opt.id === optionId) {
        opt.votes.push(userEmail);
      }
    }

    await db.collection("community").updateOne(
      { _id: new ObjectId(postId) },
      { $set: { options } }
    );

    return res.status(200).json({ message: "Voted" });
  } catch (error) {
    console.error("Error voting survey:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}