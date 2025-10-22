// Task-bezogene Typen (Platzhalter)
// Ergänze hier deine bestehenden Task-Interfaces / -Typen aus der App.
import type { ObjectId } from "mongodb";
import type { ReactNode } from "react";

// ---------- DB (Mongo) ----------
export interface SubTask {
  userId?: string;
  _id?: string;
  name: string;
  description?: string;
  points?: number;
  dueDate?: string;        // ISO yyyy-mm-dd
  time?: string;           // HH:mm
  showInDaily?: boolean;
  status?: TaskStatus;
}

export interface TaskDocument {
  userId?: string;
  _id?: ObjectId;
  name: string;
  description: string;
  points: number;
  status: "incomplete" | "completed";
  dueDate: string;  // "YYYY-MM-DD"
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  timebased: boolean;
  time: string;      // "08:00"
  progress: number;  // 0-100%
  goalId?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  duration?: string;
  excludedDates?: string[];
  subTasks?: SubTask[];
  /** Wochentage, an denen die Aufgabe erscheinen soll (0=Sonntag) */
  daysOfWeek?: number[];
  /** Intervall für Wiederholungen in Tagen */
  interval?: number;
  // ggf. weitere Felder
}

// ---------- App/Frontend ----------
export type TaskStatus =
  | "todo"
  | "in_progress"
  | "done"
  // Legacy / tolerierte Varianten:
  | "complete"
  | "completed"
  | "incomplete"
  | "open"
  | string;

export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "yearly";

export interface Task {
  category: string;
  userId?: string;
  _id: string;
  id?: string;
  name: string;
  description: string;
  points: number;
  status?: TaskStatus;
  frequency?: TaskFrequency;
  dueDate: string ;
  linkedApps: string[];
  timebased: boolean;
  time: string;             // "08:00"
  progress: number;         // 0-100%
  createdAt: string;
  updatedAt: string;
  duration?: string;
  goalId?: string;
  color?: string;
  excludedDates?: string[];
  reward?: { type: string; value: any };
  dependencies?: string[];
  subTasks?: SubTask[];
  daysOfWeek?: number[];
  interval?: number;
}

export interface CreateTaskBody {
  category: string;
  userId?: string;
  name: string;
  description: string;
  points: number;
  dueDate: string;
  frequency?: TaskFrequency;
  linkedApps?: string[];
  timebased?: boolean;
  time?: string;
  goalId?: string;
  subTasks?: SubTask[];
  color?: string;
  duration?: string;
  daysOfWeek?: number[];
  interval?: number;
  status?: TaskStatus;
}

// ---------- Completions ----------
export interface Completion {
  _id?: ObjectId;
  taskId: string;
  date: string; // ISO yyyy-mm-dd
  status: "completed" | "incomplete";
}

export interface TaskPlaceholder {
  _?: never;
}
// ... bestehende Task/SubTask/Completion bleiben

export interface Unit {
  _id: string;
  title: string;
  status: "not-started" | "in-progress" | "completed";
  note?: string;
}

export interface Chapter {
  _id: string;
  title: string;
  units: Unit[];
}

export interface OnlineModule {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  totalUnits: number;
  completedUnits: number;
  chapters: Chapter[];
  startDate?: string;
  endDate?: string;
  linkedTasks?: string[];
}
