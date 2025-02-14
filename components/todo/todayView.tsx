// TodayView.tsx
import React, { useState, useEffect } from "react";
import TaskCard from "./taskCard";
import { Task } from "@/utils/interface";
import TaskItem from "./taskItem";
import SheetWithCreateTask from "./popUpCreateTask";
const TodayView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Fetch tasks for today
    fetch("/api/tasks?dueDate=today")
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }, []);

  const handleDrag = (taskId: string, newDueTime: string) => {
    // Update the task with the new due time
    fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ dueDate: newDueTime }),
      headers: { "Content-Type": "application/json" },
    }).then(() => {
      // Update the UI after the task has been updated
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task._id === taskId ? { ...task, dueDate: newDueTime } : task
        )
      );
    });
  };

  return (
    <div>
      <h1>Today's Tasks</h1>
      <div className="task-timeline">
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onDrag={handleDrag} />
        ))}
      </div>
      <SheetWithCreateTask />
    </div>
  );
};

export default TodayView;
