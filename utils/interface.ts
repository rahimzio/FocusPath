// utils/interface.ts
export interface Task {
  _id?: string; // MongoDB ObjectId wird als String übergeben
  id?: string;
  name: string;
  description: string;
  points: number;
  status?: "completed" | "incomplete";
  dueDate: string;      // "YYYY-MM-DD"
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  createdAt: string;
  updatedAt: string;
  timebased: boolean;
  time?: string;
  duration?: string;
  goalId?: string; // in createTask übergeben, wenn verknüpft
}

export interface Goal {
  id: string; // oder _id?: string (wenn du Mongo für Goals verwendest)
  title: string;
  description: string;
  dueDate: string;
  progress: number;
  tasks: string[];
  createdAt: string;
  updatedAt: string;
}
export interface Completion {
  _id?: string; // MongoDB ObjectId
  taskId: string;  // bezieht sich auf Task._id
  date: string;    // z.B. "2025-01-19"
  status: "completed" | "incomplete";
  // optional: userId, falls pro Benutzer
  // optional: timestamp / Zeit
}