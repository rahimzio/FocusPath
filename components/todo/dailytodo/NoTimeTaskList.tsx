import React from "react";
import { Task } from "@/utils/interface";
import { FaCheckCircle } from "react-icons/fa";

interface NoTimeTaskListProps {
  tasks: Task[];
  selectedDate: string;
  handleCheckTask: (taskId: string, date: string, checked: boolean) => void;
  openTaskDetails: (task: Task) => void;
  openEditDialog: (task: Task) => void;
  confirmDelete: (task: Task) => void;
}

const NoTimeTaskList: React.FC<NoTimeTaskListProps> = ({
  tasks,
  selectedDate,
  handleCheckTask,
  openTaskDetails,
  openEditDialog,
  confirmDelete,
}) => {
  // 🔹 Zeitlose Aufgaben filtern und nach Punkten sortieren (höchste zuerst)
  const filteredTasks = tasks
    .filter((task) => !task.timebased)
    .sort((a, b) => (b.points || 0) - (a.points || 0)); // fallback: 0 wenn undefined

  return (
    <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-10 text-black">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">
        Aufgaben ohne Uhrzeit
      </h2>
      {filteredTasks.length === 0 ? (
        <p className="text-gray-600">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              style={{ borderLeft: `8px solid ${task.color || "#3B82F6"}` }}
              className={`p-3 border rounded flex items-center ${
                task.status === "completed" ? "completed" : ""
              }`}
            >
              <div className="flex-grow">
                {task.goalId && (
                  <p className="text-sm text-blue-600 font-medium mb-1">
                    🎯 Ziel-Aufgabe
                  </p>
                )}
                <h4 className="font-semibold">{task.name}</h4>
                <p>{task.description}</p>
              </div>
              {task.status === "completed" && (
                <FaCheckCircle className="text-green-500 ml-2" />
              )}
              <div className="mt-2 flex items-center">
                <input
                  id={`taskCheck-${task._id}`}
                  type="checkbox"
                  checked={task.status === "completed"}
                  onChange={(e) =>
                    handleCheckTask(task._id, selectedDate, e.target.checked)
                  }
                />
                <label htmlFor={`taskCheck-${task._id}`} className="ml-2 select-none">
                  {task.status === "completed" ? "Abgeschlossen" : "Offen"}
                </label>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => openTaskDetails(task)}
                  className="bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Details
                </button>
                <button
                  onClick={() => openEditDialog(task)}
                  className="bg-green-500 text-white px-2 py-1 rounded"
                >
                  Editieren
                </button>
                <button
                  onClick={() => confirmDelete(task)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoTimeTaskList;
