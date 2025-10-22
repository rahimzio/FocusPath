import { GoalWithProgress } from "@/utils/interfaces/goal";
import { Task } from "@/utils/interfaces/task";

export type DayScore = "L" | "M" | "W" | "W+";
export type WeekScore = "L" | "M" | "W" | "S";
export type MonthScore = "L" | "M" | "W" | "S";

/**
 * Bewertet einen einzelnen Tag basierend auf Aufgabenstatus
 */
export function evaluateDay(tasks: Task[], goals: GoalWithProgress[]): DayScore {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;

  const completedPercentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  const goalTaskIds = goals.flatMap(g => g.tasks?.map(t => t._id) || []);
  const goalTasks = tasks.filter(t => goalTaskIds.includes(t._id)|| []);
  const highPointTasks = tasks.filter(t => (t.points ?? 0) >= 7);

  const allGoalTasksDone = goalTasks.length === 0 || goalTasks.every(t => t.status === "completed");
  const allHighValueTasksDone = highPointTasks.length === 0 || highPointTasks.every(t => t.status === "completed");

  if (completedPercentage === 100) return "W+";
  if (completedPercentage >= 85 && allGoalTasksDone && allHighValueTasksDone) return "W";
  if (completedPercentage >= 75) return "M";
  return "L";
}

/**
 * Bewertet eine Woche basierend auf Tagesbewertungen
 */
export function evaluateWeek(dayScores: DayScore[]): WeekScore {
  const points = dayScores.reduce((sum, label) => {
    switch (label) {
      case "W+": return sum + 2.5;
      case "W": return sum + 2;
      case "M": return sum + 1;
      default: return sum;
    }
  }, 0);

  if (points >= 14.5) return "S";
  if (points >= 11.5) return "W";
  if (points >= 7) return "M";
  return "L";
}

/**
 * Bewertet einen Monat basierend auf Wochenbewertungen
 */
export function evaluateMonth(weekLabels: WeekScore[]): MonthScore {
  const score = weekLabels.reduce((sum, label) => {
    switch (label) {
      case "S": return sum + 3;
      case "W": return sum + 2;
      case "M": return sum + 1;
      default: return sum;
    }
  }, 0);

  if (score >= 11) return "S";
  if (score >= 8) return "W";
  if (score >= 4) return "M";
  return "L";
}
