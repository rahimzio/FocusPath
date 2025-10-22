import { Task } from "@/utils/interfaces/task";
import React from "react";
import { FaCheckCircle, FaTrashAlt, FaPen } from "react-icons/fa";

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
  const filteredTasks = tasks
    .filter((task) => !task.timebased)
    .sort((a, b) => {
      // Sortiere zuerst nach Status: offene Aufgaben zuerst
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (a.status !== "completed" && b.status === "completed") return -1;
      // Falls gleicher Status, sortiere nach Punkten
      return (b.points || 0) - (a.points || 0);
    });

  return (
<div className="bg-white p-4 rounded-xl shadow border border-[#e5e5ea]">
      <h2 className="text-base font-semibold text-[#1c1c1e] mb-3">
        📋 Aufgaben ohne Uhrzeit
      </h2>

      {filteredTasks.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              onClick={() => openTaskDetails(task)}
              className={`
                flex flex-col justify-between
                p-2
                rounded-lg
                border border-[#e5e5ea]
                bg-[#FAFAFA]
                shadow-sm hover:shadow
                transition cursor-pointer
                h-20
                min-h-[5rem]
                overflow-hidden
                ${task.status === "completed" ? "opacity-60 line-through" : ""}
              `}
              style={{ borderLeft: `4px solid ${task.color || "#007AFF"}` }}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-medium text-[#1c1c1e] break-words">
                  {task.name}
                </h3>
                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    handleCheckTask(task._id, selectedDate, e.target.checked)
                  }
                  className="accent-[#007AFF] w-3 h-3 mt-0.5"
                />
              </div>

              <div className="flex gap-1 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(task);
                  }}
                  className="text-[#34C759] hover:text-[#28a745] p-1"
                  title="Bearbeiten"
                >
                  <FaPen className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(task);
                  }}
                  className="text-[#FF3B30] hover:text-[#c82333] p-1"
                  title="Löschen"
                >
                  <FaTrashAlt className="w-3 h-3" />
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
