"use client";
import { Task } from "@/utils/interface";
import TaskItem from "./taskItem2";
interface TimeBasedTaskListProps {
  tasks: Task[];
  onTaskCompletion: (taskId: string) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

export default function TimeBasedTaskList({ tasks, onTaskCompletion, onTaskEdit, onTaskDelete }: TimeBasedTaskListProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-10 text-black">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Aufgaben mit Uhrzeit</h2>
      {tasks.length === 0 ? (
        <p className="text-gray-600">Keine zeitbasierten Aufgaben vorhanden.</p>
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
