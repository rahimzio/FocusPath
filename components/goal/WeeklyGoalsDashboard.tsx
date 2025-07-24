import React from "react";
import { Goal } from "@/utils/interface";
import GoalCard from "./GoalCard";

interface Props {
  weeklyGoals: Goal[];
  onEdit: (goal: Goal) => void;
  onMove: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onDuplicate: (goalId: string) => void;
  onReflect?: (goal: Goal) => void;
  onToggleComplete: (goal: Goal) => void;
}

const WeeklyGoalsDashboard: React.FC<Props> = ({
  weeklyGoals,
  onEdit,
  onMove,
  onDelete,
  onDuplicate,
  onReflect,
  onToggleComplete,
}) => {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">🎯 Wochenziele</h2>
      {weeklyGoals.length > 0 ? (
        weeklyGoals.map((goal) => (
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
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Keine Ziele für diese Woche</p>
      )}
    </section>
  );
};

export default WeeklyGoalsDashboard;
