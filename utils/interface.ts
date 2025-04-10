/**
 * interfaces.ts
 * Gemeinsame Sammelstelle für DB- und App-Interfaces
 */

import { ObjectId } from "mongodb";

/* -------------------------------------
 *          DB (Mongo) INTERFACES
 * ------------------------------------- */

export interface TaskDocument {
  _id?: ObjectId;
  name: string;
  description: string;
  points: number;
  status: "incomplete" | "completed";
  dueDate: string;  // z.B. "2025-01-01"
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  timebased: boolean;
  time: string;      // z.B. "08:00"
  progress: number;  // 0-100%
  goalId?: string;
  createdAt: string;
  updatedAt: string;
  color?: string;
  duration?:string;
  excludedDates?:string[];
  subTasks?: SubTask[];
  // ggf. weitere Felder
}

export interface GoalDocument {
  _id: ObjectId;
  title: string;
  description: string;
  dueDate: string;
  progress: number;      // 0-100%
  tasks?: string[];       // Liste von Task-IDs als string
  createdAt: string;
  parentGoalId?: string;
  updatedAt: Date;
  reward?: {
    type: string;
    value: any;
  };
  // ggf. weitere Felder
}

/* -------------------------------------
 *         APP/Frontend INTERFACES
 * ------------------------------------- */

export interface Task {
  _id: string;
  id?: string;
  name: string;
  description: string;
  points: number;
  status: "incomplete" | "completed" | "in-progress" | "on-hold";
  dueDate: string;          // ISO-String
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps: string[];
  timebased: boolean;
  time: string;             // "08:00"
  progress: number;         // 0-100%
  createdAt: string;
  updatedAt: string;
  duration?:string;
  goalId?: string;
  color?: string;
  excludedDates?:string[];
  reward?: {
    type: string;           // "badge" | "points" | ...
    value: any;             // "Gold-Badge" | 50 | ...
  };
  dependencies?: string[];  // Abhängigkeiten zwischen Tasks
  subTasks?: SubTask[];
}

/**
 * Goals im App-Kontext.
 * Hier kann _id ein string sein.
 */
export interface Goal {
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  progress: number;     // 0-100%
  tasks?: Task[];     // Task-IDs im String-Format
  createdAt: string;
  endDate: string;
  startDate: string;  
  type: "daily" | "weekly" | "monthly" | "yearly";
  updatedAt: string;
  subGoals:Goal[];
  parentGoalId?: string;
  reward?: {
    type: string;
    value: any;
  };
}

/**
 * Optionales Interface, falls du
 * die "Goal + Progress-Infos" kombiniert brauchst.
 */
export interface GoalWithProgress extends Goal {
  totalTasks: number;
  completedTasks: number;
  // Im Basis-Goal ist progress/dueDate/tasks optional.
  // Hier kannst du sie auf Pflicht setzen, wenn du möchtest:
  dueDate: string;
  tasks?: Task[];
}



export interface CreateTaskBody {
  name: string;
  description: string;
  points: number;
  status?: "incomplete";
  dueDate: string;
  frequency: "once" | "daily" | "weekly" | "monthly" | "yearly";
  category: string;
  linkedApps?: string[];
  timebased?: boolean;
  time?: string;
  goalId?: string;
  subTasks?: SubTask[];
  color?:string;
  duration?:string; 
}
export interface SubTask {
  _id?: string;
  name: string;
  description?: string;
  points?: number;
  dueDate?: string;   // Fälligkeitsdatum
  time?: string;      // Uhrzeit
  showInDaily?: boolean; // Häkchen
  status: "incomplete" | "completed" | "in-progress" | "on-hold";
}

/**
 * Neue Schnittstelle für Completions
 */
export interface Completion {
  _id?: ObjectId;
  taskId: string;
  date: string;
  status: "completed" | "incomplete";
}