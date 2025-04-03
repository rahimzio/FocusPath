"use client";

import { useState, useEffect } from "react";
import { Task, GoalWithProgress } from "@/utils/interface";
import SheetWithCreateTask from "@/components/todo/popUpCreateTask";
import CalendarSelector from "./todo/calendeeerSelection";
import GoalsWithProgress from "./todo/goalWithProgress";
import NoTimeTaskList from "./todo/noTimeTask";
import TimeBasedTaskList from "./todo/timeBasedTaskList";
import { toast } from "react-toastify";

const DailyTaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchTasks(selectedDate);
    fetchGoals();
  }, [selectedDate]);

  async function fetchTasks(date: string) {
    try {
      const response = await fetch(`/api/task/getTasks?date=${date}`);
      if (!response.ok) throw new Error("Fehler beim Abrufen der Aufgaben.");
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der Aufgaben.");
    }
  }

  async function fetchGoals() {
    try {
      const response = await fetch("/api/goals/getGoalsWithProgress");
      if (!response.ok) throw new Error("Fehler beim Abrufen der Ziele.");
      const data = await response.json();
      setGoals(data.goals || []);
    } catch (error) {
      console.error(error);
      toast.error("Fehler beim Laden der Ziele.");
    }
  }
  
  async function handleTaskCompletion(taskId: string) {
    try {
      await fetch("/api/task/updateTaskProgress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "completed" }),
      });
      setTasks(tasks.map(task => (task._id === taskId ? { ...task, status: "completed" } : task)));
      fetchGoals();
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Aufgabe:", error);
      toast.error("Fehler beim Abschließen der Aufgabe.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Tägliche Aufgaben</h1>
      
      <CalendarSelector
        selectedDate={selectedDate}
        showCalendar={showCalendar}
        onDateChange={(date) => setSelectedDate(date.toISOString().split("T")[0])}
        toggleCalendar={() => setShowCalendar(!showCalendar)}
      />
      
      <GoalsWithProgress goals={goals} onEditGoal={() => {}} />
      
      <NoTimeTaskList
        tasks={tasks.filter(task => !task.timebased)}
        onTaskCompletion={handleTaskCompletion}
        onTaskEdit={() => {}}
        onTaskDelete={() => {}}
      />
      
      <TimeBasedTaskList
        tasks={tasks.filter(task => task.timebased)}
        onTaskCompletion={handleTaskCompletion}
        onTaskEdit={() => {}}
        onTaskDelete={() => {}}
      />
      
      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
