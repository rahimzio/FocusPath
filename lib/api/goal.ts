// /lib/api/goal.ts

import { CreateGoalBody, Goal } from "@/utils/interfaces/goal";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text || res.statusText}`);
  }
  return res.json();
}

export async function createGoal(body: CreateGoalBody) {
  // nutzt deine bestehende Route
  const res = await fetch("/api/goals/createGoals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return j<{ goalId?: string; goal?: Goal }>(res);
}

export async function patchGoalProgress(
  goalId: string,
  progress?: number,
  completedAt?: string | null,
  recalc?: boolean
) {
  // neue Route (standardisiert)
  const res = await fetch("/api/goals/progress", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId, progress, completedAt, recalc }),
  });
  return j<{ ok: true; goalId: string; progress: number; completedAt: string | null }>(res);
}

export async function updateGoal(payload: Partial<Goal> & { goalId: string }) {
  // bevorzugt neuer Pfad …
  let res = await fetch("/api/goals/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // … Fallback auf Legacy-Pfad, falls nicht vorhanden
  if (res.status === 404) {
    res = await fetch(`/api/goals/updateGoal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
  return j<{ ok: true }>(res);
}

export async function deleteGoal(goalId: string) {
  const res = await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
  return j<{ ok: true }>(res);
}

export async function duplicateGoal(goalId: string) {
  const res = await fetch(`/api/goals/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId }),
  });
  return j<{ goal: Goal }>(res);
}
