"use client";
import { Task } from "@/utils/interface";
import TaskItem from "./taskItem2";
interface NoTimeTaskListProps {
  tasks: Task[];
  onTaskCompletion: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

export default function NoTimeTaskList({ tasks, onTaskCompletion, onTaskEdit, onTaskDelete }: NoTimeTaskListProps) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-10 text-black">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Aufgaben ohne Uhrzeit</h2>
      {tasks.length === 0 ? (
        <p className="text-gray-600">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {tasks.map((task) => (
            <TaskItem key={task._id} task={task} onTaskCompletion={onTaskCompletion} onTaskEdit={onTaskEdit} onTaskDelete={onTaskDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
