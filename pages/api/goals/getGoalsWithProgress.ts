import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/mongo';
import { ObjectId } from 'mongodb';
import { GoalWithProgress } from '@/utils/interfaces/goal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const rawGoals = await appData.aggregate([
      {
        $match: {
          type: "goal",
          userId,
        },
      },
      {
        $lookup: {
          from: "appData",
          let: { goal_id: "$_id", uid: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$type", "task"] },
                    { $eq: ["$goalId", { $toString: "$$goal_id" }] },
                    { $eq: ["$userId", "$$uid"] }
                  ],
                },
              },
            },
          ],
          as: "tasks",
        },
      },
      {
        $addFields: {
          totalTasks: { $size: "$tasks" },
          completedTasks: {
            $size: {
              $filter: {
                input: "$tasks",
                as: "task",
                cond: { $eq: ["$$task.status", "completed"] },
              },
            },
          },
          progress: {
            $cond: [
              { $eq: [{ $size: "$tasks" }, 0] },
              0,
              {
                $multiply: [
                  { $divide: [
                    {
                      $size: {
                        $filter: {
                          input: "$tasks",
                          as: "task",
                          cond: { $eq: ["$$task.status", "completed"] },
                        },
                      },
                    },
                    { $size: "$tasks" }
                  ] },
                  100,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          tasks: 0,
          type: 0,
        },
      },
    ]).toArray();

    const goalsWithProgress: GoalWithProgress[] = rawGoals.map(goal => ({
      _id: goal._id.toString(),
      title: goal.title,
      description: goal.description,
      createdAt: new Date(goal.createdAt).toISOString(),
      updatedAt: new Date(goal.updatedAt).toISOString(),
      totalTasks: goal.totalTasks || 0,
      completedTasks: goal.completedTasks || 0,
      progress: goal.progress || 0,
      dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString() : "",
      endDate: goal.endDate ? new Date(goal.endDate).toISOString() : "",
      startDate: goal.startDate ? new Date(goal.startDate).toISOString() : "",
      type: goal.type || "daily",
      subGoals: goal.subGoals || [],
      goalType: goal.goalType || "", // Add this line to include goalType
    }));

    return res.status(200).json({ goals: goalsWithProgress });
  } catch (error) {
    console.error("❌ Fehler bei getGoalsWithProgress:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
