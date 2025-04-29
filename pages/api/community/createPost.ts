// pages/api/community/createPost.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Category, CommunityPost, PostType } from "@/utils/interface";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { title, content, type, createdBy, category } = req.body;

    // Validation
    if (!title || !content || !type || !createdBy) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["update", "survey", "userTopic"].includes(type)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    if (type === "userTopic" && !category) {
      return res.status(400).json({ message: "Category required for userTopic" });
    }

    const { db } = await connectToDatabase();

    const newPost: CommunityPost = {
      _id: new ObjectId(),
      title,
      content,
      type: type as PostType,
      createdBy,
      createdAt: new Date().toISOString(),
      ...(type === "userTopic" ? { category: category as Category, comments: [] } : {}),
    };

    await db.collection("community").insertOne(newPost);

    return res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Error creating community post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}