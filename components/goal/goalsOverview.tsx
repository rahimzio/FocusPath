import React from "react";
import GoalManager from "./GoalManager";
import NewGoalForm from "./createGoal";

const goalOverview = () => {
  return (
   <div>
   <GoalManager></GoalManager>
    <NewGoalForm></NewGoalForm>
    </div>
  );
};

export default goalOverview;