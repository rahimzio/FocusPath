// ⬇️ direkt unter deine bestehenden Imports setzen
const __BASE_URL__ =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

/** Rechnet den Fortschritt des Ziels serverseitig neu (Tasks/Subgoals) */
async function __recalcGoalProgress(goalId?: string) {
  if (!goalId) return;
  try {
    await fetch(`${__BASE_URL__}/api/goals/progress`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, recalc: true }),
      // keepalive optional – bei Vercel hilft es, den Request bei Short-Lived Lambdas zu halten
    } as any);
  } catch (e) {
    console.error("[recalcGoalProgress] failed", e);
  }
}
