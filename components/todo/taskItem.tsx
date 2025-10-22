// components/TaskItem.tsx
import { Task } from "@/utils/interfaces/task";
import React from "react";

interface TaskItemProps {
  task: Task;
  selectedDate: string;
  onCheck: (taskId: string, date: string, checked: boolean) => void;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDetails: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  selectedDate,
  onCheck,
  onDelete,
  onEdit,
  onDetails,
}) => {
  return (
    <div className="p-3 border rounded">
      <h4 className="font-semibold">{task.name}</h4>
      <p>{task.description}</p>
      {task.time && (
        <p className="text-sm">
          <span className="font-medium">Uhrzeit:</span> {task.time}
        </p>
      )}
      {/* Checkbox => handleCheckTask */}
      <div className="mt-2 flex items-center">
        <input
          id={`taskCheck-${task._id}`}
          type="checkbox"
          checked={task.status === "completed"}
          onChange={(e) =>
            onCheck(task._id!, selectedDate, e.target.checked)
          }
        />
        <label
          htmlFor={`taskCheck-${task._id}`}
          className="ml-2 select-none"
        >
          {task.status === "completed" ? "Abgeschlossen" : "Offen"}
        </label>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => onDetails(task)}
          className="bg-blue-500 text-white px-2 py-1 rounded"
        >
          Details
        </button>
        <button
          onClick={() => onEdit(task)}
          className="bg-green-500 text-white px-2 py-1 rounded"
        >
          Editieren
        </button>
        <button
          onClick={() => onDelete(task._id!)}
          className="bg-red-500 text-white px-2 py-1 rounded"
        >
          Löschen
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
