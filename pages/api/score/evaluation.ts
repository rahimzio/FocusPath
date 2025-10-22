// utils/evaluation.ts

import { Task } from "@/utils/interfaces/task";

export type DayRating = "L" | "M" | "W" | "W+";

export interface DayEvaluation {
  date: string; // Format: YYYY-MM-DD
  rating: DayRating;
  score: number;
  tasksDone: number;
  tasksTotal: number;
}

export function calculateDayEvaluation(tasks: Task[], date: string): DayEvaluation {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "completed").length;

  const goalTasks = tasks.filter((t) => !!t.goalId);
  const goalTasksDone = goalTasks.filter((t) => t.status === "completed").length;

  const highPointTasks = tasks.filter((t) => (t.points ?? 0) >= 7);
  const highPointTasksDone = highPointTasks.filter((t) => t.status === "completed").length;

  const percent = total === 0 ? 0 : (done / total) * 100;

  let rating: DayRating = "L";
  let score = 0;

  if (percent === 100) {
    rating = "W+";
    score = 2.5;
  } else if (
    percent >= 85 &&
    goalTasks.length > 0 &&
    goalTasks.length === goalTasksDone &&
    highPointTasks.length === highPointTasksDone
  ) {
    rating = "W";
    score = 2;
  } else if (percent >= 75) {
    rating = "M";
    score = 1;
  } else if (percent < 50) {
    rating = "L";
    score = 0;
  }

  return {
    date,
    rating,
    score,
    tasksDone: done,
    tasksTotal: total,
  };
}
