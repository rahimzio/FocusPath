// GoalCard.tsx
import { Goal } from '@/utils/interface';
import React from 'react';

const GoalCard = ({ goal }: { goal: Goal }) => {
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
