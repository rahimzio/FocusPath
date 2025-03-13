import React from "react";
import GoalManager from "@/components/goal/GoalManager";
import NewGoalForm from "@/components/goal/createGoal";
import GoalManager1 from "@/components/goal/main";
export default function GoalsPage() {
  const handleCreateGoal = (goal: { title: string; description: string; startDate: string; endDate: string; type: string }) => {
    console.log("Goal created:", goal);
  };

  return (
    <div>
      <div><GoalManager /></div>
      <div><GoalManager1/></div>
      <div><NewGoalForm /></div>
    </div>
  );
}
