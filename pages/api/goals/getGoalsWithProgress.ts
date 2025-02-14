// pages/api/goal/getGoalsWithProgress.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/mongo'; // Stelle sicher, dass dieser Pfad korrekt ist
import { GoalWithProgress } from '@/utils/interface';
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { db } = await connectToDatabase();
    const goalsCollection = db.collection('goals');

    const rawGoals = await goalsCollection.aggregate([
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'goalId',
          as: 'tasks',
        },
      },
      {
        $addFields: {
          totalTasks: { $size: '$tasks' },
          completedTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                as: 'task',
                cond: { $eq: ['$$task.status', 'completed'] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          progress: {
            $cond: [
              { $eq: ['$totalTasks', 0] },
              0,
              { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
            ],
          },
        },
      },
      {
        $project: {
          tasks: 0, // Entferne das tasks-Feld, falls nicht benötigt
        },
      },
    ]).toArray();

    // Mapping der Rohdaten zu GoalWithProgress, dabei werden die fehlenden Felder ergänzt:
    const goalsWithProgress: GoalWithProgress[] = rawGoals.map(goal => ({
      _id: (goal._id as ObjectId).toString(),
      title: goal.title,
      description: goal.description,
      createdAt: new Date(goal.createdAt).toISOString(),
      updatedAt: new Date(goal.updatedAt).toISOString(),
      totalTasks: goal.totalTasks,
      completedTasks: goal.completedTasks,
      progress: goal.progress,
      dueDate: goal.dueDate ? new Date(goal.dueDate).toISOString() : "",
      tasks: goal.tasks || [],
      // Hier die fehlenden Felder mit den Werten aus der DB oder Standardwerten
      endDate: goal.endDate ? new Date(goal.endDate).toISOString() : "",
      startDate: goal.startDate ? new Date(goal.startDate).toISOString() : "",
      type: goal.type || "daily", // Standard: "daily" falls kein Wert vorhanden
      subGoals: goal.subGoals || [] // Standard: leeres Array
    }));

    res.status(200).json({ goals: goalsWithProgress });
  } catch (error) {
    console.error('Fehler bei getGoalsWithProgress:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
