import React, { useMemo } from "react";
import { Goal } from "@/utils/interface";
import GoalCard from "./GoalCard";

interface WeeklyGoalsDashboardProps {
  weeklyGoals: Goal[];
  onEdit: (goal: Goal) => void;
  onMove: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onDuplicate: (goalId: string) => void;
  onReflect?: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
}

const WeeklyGoalsDashboard: React.FC<WeeklyGoalsDashboardProps> = ({
  weeklyGoals,
  onEdit,
  onMove,
  onDelete,
  onDuplicate,
  onReflect,
  onToggleComplete,
}) => {
  const goals = weeklyGoals || [];

  const stats = useMemo(() => {
    const total = goals.length;
    const done = goals.filter((g) => (g.progress ?? 0) >= 100).length;
    const open = total - done;
    // recurring-Flag ist optional → nur zählen, wenn gesetzt
    const oneoff = goals.filter((g) => (g as any).recurring === false).length;
    const recurring = goals.filter((g) => (g as any).recurring === true).length;

    // sortiere nach Enddatum (aufsteigend), dann nach Fortschritt
    const sorted = [...goals].sort((a, b) => {
      const ae = new Date(a.endDate).getTime();
      const be = new Date(b.endDate).getTime();
      if (ae !== be) return ae - be;
      return (a.progress ?? 0) - (b.progress ?? 0);
    });

    return { total, done, open, oneoff, recurring, sorted };
  }, [goals]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">🗓 Wöchentliche Ziele (aktuelle Woche)</h2>
        <div className="text-xs text-muted-foreground flex gap-3">
          <span>gesamt: <b>{stats.total}</b></span>
          <span>offen: <b>{stats.open}</b></span>
          <span>erledigt: <b>{stats.done}</b></span>
          <span>einmalig: <b>{stats.oneoff}</b></span>
          <span>wiederkehrend: <b>{stats.recurring}</b></span>
        </div>
      </div>

      {stats.sorted.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.sorted.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              onEdit={onEdit}
              onMove={onMove}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onReflect={onReflect}
              onToggleComplete={onToggleComplete}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine wöchentlichen Ziele für diese Woche vorhanden.
        </p>
      )}
    </section>
  );
};

export default WeeklyGoalsDashboard;
