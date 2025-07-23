"use client";

import React from "react";
import { useGoalManager } from "@/utils/goals/useGoalManager";
import GoalHeader from "./GoalsHeader";
import GoalContainerSection from "./GoalsContainer";
import SubtaskModal from "./subtaskModal";
import NewGoalForm from "./createGoal";
import { Task, Goal } from "@/utils/interface";

export default function GoalPage() {
  const {
    userId,
    goals,
    setGoals,
    subTaskModalOpen,
    setSubTaskModalOpen,
    newSubTasks,
    setNewSubTasks,
    currentTaskForSubtasks,
    setCurrentTaskForSubtasks,
    handleAddWeeklyGoal,
    handleGenerateDailyTasksForWeekGoal,
    handleCompleteTask,
    handleOpenSubTaskModal,
    handleCompleteSubTask,
    handleChangeSubTask,
    handleAddSubTaskRow,
    handleSaveSubTasks,
    handleCloseSubTaskModal,
    dailyGoals,
    weeklyGoals,
    monthlyGoals,
    yearlyGoals,
  } = useGoalManager();

  // ➡️ Neues Ziel hinzufügen und Goals-List sofort updaten
  const handleGoalCreated = (newGoal: Goal) => {
    setGoals((prev) => [...prev, newGoal]);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 text-gray-800">
      <GoalHeader />

      {/* Neues Ziel Formular */}
      <div className="mb-8">
        <NewGoalForm onGoalCreated={handleGoalCreated} />
      </div>

      {/* Ziele-Container */}
      <GoalContainerSection
        title="Jahresziele"
        goals={yearlyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={handleOpenSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      <GoalContainerSection
        title="Monatsziele"
        goals={monthlyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={handleOpenSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      <GoalContainerSection
        title=""
        goals={weeklyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={handleOpenSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      <GoalContainerSection
        title="Tagesziele"
        goals={dailyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={handleOpenSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      {/* Modal für Subtasks */}
      {subTaskModalOpen && (
        <SubtaskModal
          task={currentTaskForSubtasks}
          newSubTasks={newSubTasks}
          setNewSubTasks={setNewSubTasks}
          onChangeSubTask={handleChangeSubTask}
          onAddSubTaskRow={handleAddSubTaskRow}
          onSaveSubTasks={handleSaveSubTasks}
          onClose={handleCloseSubTaskModal}
        />
      )}
    </div>
  );
}
