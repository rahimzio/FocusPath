import React, { useMemo } from "react";
import GoalCard from "./GoalCard";
import { Goal } from "@/utils/interfaces/goal";

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
    const done = goals.filter((g) => (g.progress ?? 0) >= 100 || !!g.completedAt).length;
    const open = Math.max(0, total - done);

    // recurring-Flag ist optional → nur zählen, wenn gesetzt
    const oneoff = goals.filter((g) => (g as any).recurring === false).length;
    const recurring = goals.filter((g) => (g as any).recurring === true).length;

    // sortiere nach Enddatum (aufsteigend), dann nach Fortschritt
    const sorted = [...goals].sort((a, b) => {
      const ae = new Date(a.endDate).getTime();
      const be = new Date(b.endDate).getTime();
      if (!Number.isFinite(ae) || !Number.isFinite(be)) {
        return (Number.isFinite(ae) ? -1 : 0) + (Number.isFinite(be) ? 1 : 0);
      }
      if (ae !== be) return ae - be;
      return (a.progress ?? 0) - (b.progress ?? 0);
    });

    return { total, done, open, oneoff, recurring, sorted };
  }, [goals]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold">
          🗓 Wöchentliche Ziele (aktuelle Woche)
        </h2>
        <div className="text-[11px] sm:text-xs text-muted-foreground flex flex-wrap items-center gap-2 sm:gap-3">
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
