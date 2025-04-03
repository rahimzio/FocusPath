"use client";
import { Task } from "@/utils/interface";

interface TaskItemProps {
  task: Task;
  onTaskCompletion: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

export default function TaskItem({ task, onTaskCompletion, onTaskEdit, onTaskDelete }: TaskItemProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg flex justify-between items-center hover:shadow-xl transition-all duration-300">
      <div>
        <h2 className="text-lg font-semibold">{task.name}</h2>
        <p className="text-gray-600 text-sm">{task.description}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onTaskCompletion(task._id)}
          className={`px-4 py-2 rounded-lg text-white font-semibold transition-all duration-300 ${task.status === "completed" ? "bg-green-500" : "bg-blue-500 hover:bg-blue-700"}`}
        >
          {task.status === "completed" ? "✔ Erledigt" : "✅ Abschließen"}
        </button>
        <button onClick={() => onTaskEdit(task)} className="bg-yellow-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-yellow-600">✏️</button>
        <button onClick={() => onTaskDelete(task._id)} className="bg-red-500 px-4 py-2 rounded-lg text-white font-semibold hover:bg-red-600">🗑</button>
      </div>
    </div>
  );
}
