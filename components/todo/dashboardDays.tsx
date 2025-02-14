// Dashboard.tsx
import React, { useState, useEffect } from "react";
import TaskCard from "./taskCard";
import { Task } from "@/utils/interface";

const Dashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<string>("daily"); // default: täglich

  useEffect(() => {
    // Hole Aufgaben basierend auf dem Filter
    fetch(`/api/tasks?frequency=${filter}`)
      .then((res) => res.json())
      .then((data) => setTasks(data));
  }, [filter]);

  // Definition der leeren Funktion
  const empty = () => {};

  return (
    <div>
      <h1>Deine Aufgaben</h1>
      <div>
        <button onClick={() => setFilter("daily")}>Täglich</button>
        <button onClick={() => setFilter("weekly")}>Wöchentlich</button>
        <button onClick={() => setFilter("monthly")}>Monatlich</button>
        <button onClick={() => setFilter("yearly")}>Jährlich</button>
      </div>
      <div>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDrag={empty} />
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
