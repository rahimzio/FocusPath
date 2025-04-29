// utils/goals/useGoalManager.ts
import { useState, useEffect } from "react";
import { Goal, SubTask, Task } from "@/utils/interface";
import { getSession } from "next-auth/react";

export function useGoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [userId, setUserId] = useState<string>("");

  // Für Subtask-Modal
  const [subTaskModalOpen, setSubTaskModalOpen] = useState(false);
  const [currentTaskForSubtasks, setCurrentTaskForSubtasks] = useState<Task | null>(null);
  const [newSubTasks, setNewSubTasks] = useState<SubTask[]>([]);

  useEffect(() => {
    const fetchUserId = async () => {
      const session = await getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadGoals = async () => {
      try {
        const res = await fetch(`/api/goals/getGoals?userId=${userId}`);
        const data = await res.json();
        if (res.ok) {
          setGoals(data.goals);
        } else {
          console.error("Fehler beim Laden:", data.message);
        }
      } catch (err) {
        console.error("Netzwerkfehler:", err);
      }
    };
    loadGoals();
  }, [userId]);

  const handleOpenSubTaskModal = (task: Task) => {
    setCurrentTaskForSubtasks(task);
    setNewSubTasks([]);
    setSubTaskModalOpen(true);
  };

  const handleCloseSubTaskModal = () => {
    setSubTaskModalOpen(false);
    setCurrentTaskForSubtasks(null);
  };

  const handleChangeSubTask = (index: number, field: keyof SubTask, value: any) => {
    setNewSubTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddSubTaskRow = () => {
    setNewSubTasks((prev) => [
      ...prev,
      { _id: Math.random().toString(36).substring(2), name: "", status: "incomplete", points: 0 },
    ]);
  };

  const handleSaveSubTasks = () => {
    if (!currentTaskForSubtasks) return;
    const merged = [...(currentTaskForSubtasks.subTasks || []), ...newSubTasks];
    const updatedGoals = goals.map((goal) => ({
      ...goal,
      tasks: goal.tasks?.map((task) =>
        task._id === currentTaskForSubtasks._id ? { ...task, subTasks: merged } : task
      ),
    }));
    setGoals(updatedGoals);
    handleCloseSubTaskModal();
  };

  const handleAddWeeklyGoal = () => {};
  const handleGenerateDailyTasksForWeekGoal = () => {};
  const handleCompleteTask = () => {};
  const handleCompleteSubTask = () => {};


  return {
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
    dailyGoals: goals.filter((g) => g.goalType === "daily"),
    weeklyGoals: goals.filter((g) => g.goalType === "weekly"),
    monthlyGoals: goals.filter((g) => g.goalType === "monthly"),
    yearlyGoals: goals.filter((g) => g.goalType === "yearly"),
  };
  
}
