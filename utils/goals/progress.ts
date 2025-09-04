// /utils/goals/progress.ts
export type TaskStatus = 'todo' | 'in_progress' | 'done' | string;

export interface TaskLite {
  _id?: string;
  status?: TaskStatus;
  weight?: number;
}

export interface GoalLite {
  _id?: string;
  progress?: number;        // 0..100
  weight?: number;
  tasks?: TaskLite[];
  subGoals?: GoalLite[];
}

export function normalizeGoalType(input?: string): 'daily'|'weekly'|'monthly'|'yearly'|'once'|'mental'|undefined {
  if (!input) return undefined;
  const t = input.toLowerCase();
  if (['day','daily'].includes(t)) return 'daily';
  if (['week','weekly'].includes(t)) return 'weekly';
  if (['month','monthly'].includes(t)) return 'monthly';
  if (['year','yearly','annual'].includes(t)) return 'yearly';
  if (['once','single'].includes(t)) return 'once';
  if (['mental'].includes(t)) return 'mental';
  return input as any;
}

export function isTaskDone(status?: TaskStatus) {
  const s = (status || '').toLowerCase();
  return s === 'done' || s === 'complete' || s === 'completed';
}

export function isTaskTodo(status?: TaskStatus) {
  const s = (status || '').toLowerCase();
  return s === 'todo' || s === 'incomplete' || s === 'open';
}

/**
 * Rekursive, gewichtete Fortschrittsberechnung.
 * - Tasks zählen mit weight (Default 1) → done = 1, sonst 0
 * - Subgoals zählen mit weight (Default 1) → nutzen deren progress (0..100)
 */
export function computeGoalProgress(goal: GoalLite): number {
  const tasks = goal.tasks ?? [];
  const subs  = goal.subGoals ?? [];

  const taskWeights = tasks.map(t => t.weight ?? 1);
  const subWeights  = subs.map(s => s.weight ?? 1);

  const totalWeight = [...taskWeights, ...subWeights].reduce((a,b)=>a+b, 0) || 1;

  const taskScore = tasks.reduce((sum,t) => sum + ((t.weight ?? 1) * (isTaskDone(t.status) ? 1 : 0)), 0);
  const subScore  = subs.reduce((sum,sg) => {
    const w = sg.weight ?? 1;
    const p = Math.max(0, Math.min(100, sg.progress ?? 0));
    return sum + w * (p / 100);
  }, 0);

  return Math.round(100 * (taskScore + subScore) / totalWeight);
}

/**
 * Hilfsfunktion fürs Create: kombiniert Backend‑Antwort mit den lokal erstellten Tasks,
 * falls die API Tasks nicht mitsendet.
 */
export function mergeCreatedGoal<T extends { tasks?: TaskLite[] }>(
  apiGoal: T,
  localTasks?: TaskLite[]
): T {
  if (apiGoal?.tasks && apiGoal.tasks.length > 0) return apiGoal;
  return { ...apiGoal, tasks: localTasks ?? [] };
}
