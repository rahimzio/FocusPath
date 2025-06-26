import { useEffect } from "react";
import dayjs from "dayjs";
import { Task, GoalWithProgress } from "@/utils/interface";

export function useDailyRatingAutoSave({ userId, tasks, goals }: {
  userId: string;
  tasks: Task[];
  goals: GoalWithProgress[];
}) {
  useEffect(() => {
    if (!userId || !tasks.length) return;

    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const key = `rating_saved_${yesterday}`;
    if (localStorage.getItem(key)) {
      console.log("Rating für", yesterday, "wurde bereits gespeichert (localStorage).");
      return;
    }

    const calculateDayScore = (tasks: Task[], goals: GoalWithProgress[]): string => {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const percent = total ? (completed / total) * 100 : 0;
      const allGoalTasksDone = tasks.filter(t => t.goalId).every(t => t.status === "completed");
      const allImportantDone = tasks.filter(t => t.points && t.points > 7).every(t => t.status === "completed");
      if (percent === 100) return "W+ Day";
      if (percent >= 85 && allGoalTasksDone && allImportantDone) return "W Day";
      if (percent >= 50) return "M Day";
      return "L Day";
    };

    const saveRating = async () => {
      const rating = calculateDayScore(tasks, goals);
      console.log("Berechnetes Rating für", yesterday, ":", rating);

      const res = await fetch("/api/stats/saveDailyRating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date: yesterday, rating }),
      });

      const json = await res.json();
      if (!json.alreadyExists) {
        localStorage.setItem(key, "true");
        console.log("Tagesrating erfolgreich gespeichert für", yesterday);
      } else {
        console.log("Rating existiert bereits in der Datenbank für", yesterday);
      }
    };

    saveRating();
  }, [userId, tasks, goals]);
}
