// GoalCard.tsx
import { Goals } from "@/utils/interface";
import React from "react";

const GoalCard = ({ goal }: { goal: Goals }) => {
  return (
    <div className="goal-card">
      <h3>{goal.title}</h3>
      <p>{goal.description}</p>
      <p>Fälligkeitsdatum: {goal.dueDate}</p>
      <p>Fortschritt: {goal.progress}%</p>
    </div>
  );
};

export default GoalCard;
