// Goal/Ziele-bezogene Typen (Platzhalter)
// Ergänze hier deine Ziel-Interfaces (Monthly/Weekly Goals, Progress, Subtasks etc.).
import type { ObjectId } from "mongodb";
import { Task, CreateTaskBody } from "./task";

export type GoalType = "once" | "daily" | "weekly" | "monthly" | "yearly" | "mental";

// ---------- DB (Mongo) ----------
export interface GoalDocument {
  userId?: string;
  _id: ObjectId;
  title: string;
  description: string;
  dueDate: string;
  progress: number;      // 0-100%
  tasks?: string[];      // Liste von Task-IDs als string
  createdAt: string;
  parentGoalId?: string;
  updatedAt: Date;
  category?: string;
  reward?: { type: string; value: any };
  // ggf. weitere Felder
}

// ---------- App/Frontend ----------
export interface Goal {
  userId?: string;
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  progress: number;     // 0-100%
  tasks?: Task[];
  createdAt: string;
  endDate: string;
  startDate: string;
  category?: string;
  goalType?: GoalType;  // bevorzugt
  type?: GoalType;      // fallback
  completedAt?: string;
  updatedAt: string;
  subGoals: Goal[];
  parentGoalId?: string;
  reward?: { type: string; value: any };
}

export interface GoalWithProgress extends Goal {
  totalTasks: number;
  completedTasks: number;
  dueDate: string;      // hier Pflicht
  tasks?: Task[];
}

// ---------- API ----------
export interface CreateGoalBody {
  userId: string;
  title: string;
  description?: string;
  startDate: string;   // ISO yyyy-mm-dd
  endDate: string;     // ISO yyyy-mm-dd
  goalType: GoalType;
  type?: GoalType;     // fallback
  category?: string;
  tasks?: CreateTaskBody[];
  // Optional sofort gesetzt:
  subGoals?: Goal[];
  weight?: number;
}

export interface GetGoalsResponse { goals: Goal[]; }
export interface CreateGoalResponse { goal: Goal; }

export interface GoalPlaceholder {
  _?: never;
}
