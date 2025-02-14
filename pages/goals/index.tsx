import React from "react";
import GoalManager from "@/components/goal/GoalManager";
import NewGoalForm from "@/components/goal/createGoal";

export default function GoalsPage() {
  const handleCreateGoal = (goal: { title: string; description: string; startDate: string; endDate: string; type: string }) => {
    console.log("Goal created:", goal);
  };

  return (
    <div>
      <div><GoalManager /></div>
      <div><NewGoalForm /></div>
    </div>
  );
}
