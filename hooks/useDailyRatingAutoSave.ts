import { useEffect } from "react";
import dayjs from "dayjs";
import { GoalWithProgress } from "@/utils/interfaces/goal";
import { Task } from "@/utils/interfaces/task";

export function useDailyRatingAutoSave({ userId, tasks, goals }: {
  userId: string;
  tasks: Task[];
  goals: GoalWithProgress[];
}) {
  useEffect(() => {
 if (!userId) return;

    const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const key = `rating_saved_${yesterday}`;
    if (localStorage.getItem(key)) {
      console.log("Rating für", yesterday, "wurde bereits gespeichert (localStorage).");
      return;
    }

    const calculateDayScore = (ts: Task[], gls: GoalWithProgress[]): string => {
      const total = ts.length;
      const completed = ts.filter(t => t.status === "completed").length;
      const percent = total ? (completed / total) * 100 : 0;
      const allGoalTasksDone = ts.filter(t => t.goalId).every(t => t.status === "completed");
      const allImportantDone = ts.filter(t => t.points && t.points > 7).every(t => t.status === "completed");
      if (percent === 100) return "W+ Day";
      if (percent >= 85 && allGoalTasksDone && allImportantDone) return "W Day";
      if (percent >= 50) return "M Day";
      return "L Day";
    };

    const saveRating = async () => {
      try {
        const checkRes = await fetch("/api/stats/saveDailyRating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, date: yesterday }),
        });
        const checkJson = await checkRes.json();
        if (checkJson.alreadyExists) {
          console.log("Rating existiert bereits in der Datenbank für", yesterday);
          localStorage.setItem(key, "true");
          return;
        }

        let dayTasks = tasks;
        try {
          const tRes = await fetch(`/api/task/getTasks?date=${yesterday}&userId=${userId}`);
          if (tRes.ok) {
            const tJson = await tRes.json();
            dayTasks = [...tJson.groupedTasks.goalTasks, ...tJson.groupedTasks.otherTasks];
          }
        } catch (err) {
          console.error("Fehler beim Laden der Vortag-Tasks:", err);
        }

        const rating = calculateDayScore(dayTasks, goals);
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
      } catch (err) {
        console.error("Fehler beim automatischen Speichern des Ratings:", err);
      }
    };

    saveRating();
  }, [userId, tasks, goals]);
}
