/**
 * interfaces.ts
 * Gemeinsame Sammelstelle für DB- und App-Interfaces
 */

import { ObjectId } from "mongodb";

/* -------------------------------------
 *          DB (Mongo) INTERFACES
 * ------------------------------------- */

export interface TaskDocument {
  userId?:string;
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
  userId?:string;
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
  userId?:string;
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
  userId?:string;
  _id: string;
  title: string;
  description: string;
  dueDate?: string;
  progress: number;     // 0-100%
  tasks?: Task[];     // Task-IDs im String-Format
  createdAt: string;
  endDate: string;
  startDate: string;  
  type: "once"|"daily" | "weekly" | "monthly" | "yearly" |"none";
  goalType: "once"|"daily" | "weekly" | "monthly" | "yearly"| "none";
  completedAt?:string;
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
  userId?:string;
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
  userId?:string;
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


// frequencyProfile.ts

export interface FrequencyProfile {
  userId: string;
  createdAt: string;
  updatedAt?: string;

  // 🧠 Mindset & Verhalten
  responseToFailure: string; // z.B. "Ich nehme es als Lernmöglichkeit."
  defaultReactionInStress: string; // z.B. "Ich atme tief durch und bleibe ruhig."

  // ❤️ Emotionale Zielzustände
  coreEmotions: string[]; // z.B. ["Dankbarkeit", "Freude"]
  additionalEmotionNotes?: string;

  // 🧭 Denkweise
  viewOnChallenges: number; // Skala 1–5
  decisionMakingStyle: number; // 1 = rational, 5 = intuitiv

  // 💪 Selbstvertrauen & Überzeugung
  selfBeliefLevel: number; // 1 = Ich zweifle stark, 5 = Ich weiß, dass ich alles schaffen kann
  convictionStyle: string; // z. B. „Ich handle entschlossen, egal wie es aussieht von außen“

  // 🌟 Vision & Idealzustand
  idealDayDescription: string;
  idealMorningRoutine?: string;
  idealEveningRoutine?: string;

  // 💃 Körpersprache / Auftreten
  bodyLanguageTraits: string[]; // z.B. ["aufrecht", "ruhig", "kraftvoll"]

  // 🧱 Werte
  coreValues: string[]; // z.B. ["Klarheit", "Authentizität", "Liebe"]
  customValues?: string[];

  // 🧹 Schattenmuster
  shadowPatterns: string[]; // z.B. ["Perfektionismus", "Vergleichen"]
  forbiddenBehaviors: string[]; // Liste der Dinge, die der User vermeiden will

  // ✨ Inspiration
  inspirationPersona?: string; // z.B. "Zuko aus Avatar"
  inspirationNotes?: string;


}


export type PostType = "update" | "survey" | "userTopic";
export type Category = "Bug Report" | "Feature Wunsch" | "Allgemein";

export interface CommunityPost {
  _id: ObjectId;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string; // E-Mail-Adresse
  type: "update" | "survey" | "userTopic";
  category?: "Bug Report" | "Feature Wunsch" | "Allgemein"; // Nur bei userTopics
  comments?: Comment[]; // Nur bei userTopics
}

export interface Comment {
  _id: ObjectId;
  userId: string;
  userEmail: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  upvotes: string[]; // userIds
  downvotes: string[]; // userIds
}

export interface Post {
  id: string;
  title: string;
  content: string;
  type: "update" | "survey" | "userTopic";
  createdAt: string;
  category?: string;
}

export interface TradeEntry {
  _id?: string;
  userId: string;
  date: string; // Format: YYYY-MM-DD
  symbol: string;
  setup: string;
  entry: number;
  exit: number;
  stopLoss: number;
  positionSize: number;
  result: "win" | "loss" | "BE";
  pnl: number;
  rating: number; // 1–10
  screenshotUrl?: string;
  notes?: string;
  tags?: string[];
  ruleViolations?: string[];
  emotions?: string;
  entryTime?: string;
  exitTime?: string;
  linkedGoalId?: string;
}


export interface TradeEntryVectorReady extends TradeEntry {
  tradeSummaryText: string;
  reflectionNotes: string;
  ruleViolationsVector: string[];
  tagsVector: string[];
  setupVector: string;
  embeddingSourceText: string;
}
// --------------------
// Online-Studium Module
// --------------------

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