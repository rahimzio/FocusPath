// /lib/server/recalcGoalProgress.ts
export async function recalcGoalProgress(goalId?: string) {
  if (!goalId) return;
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    await fetch(`${base}/api/goals/updateGoalProgress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, recalc: true }),
    } as any);
  } catch (e) {
    console.error("[recalcGoalProgress] failed", e);
  }
}
