import React from "react";
import { Task } from "@/utils/interface";
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
    <div className="bg-white p-5 rounded-xl shadow border border-[#e5e5ea]">
      <h2 className="text-lg font-semibold text-[#1c1c1e] mb-4">
        📋 Aufgaben ohne Uhrzeit
      </h2>
      {filteredTasks.length === 0 ? (
        <p className="text-gray-500">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
      ) : (
        <div className="flex gap-3 max-w-full overflow-x-auto pb-1">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              className={`flex flex-col justify-between w-32 min-w-[130px] h-32 p-2.5 rounded-lg border border-[#e5e5ea] bg-[#FAFAFA] shadow-sm hover:shadow transition cursor-pointer relative ${task.status === "completed" ? "opacity-60 line-through" : ""}`}
              style={{ borderLeft: `5px solid ${task.color || "#007AFF"}` }}
              onClick={() => openTaskDetails(task)}
            >
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-[#1c1c1e] break-words overflow-hidden">
                  {task.name}
                </h3>
                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleCheckTask(task._id, selectedDate, e.target.checked)}
                  className="accent-[#007AFF] w-4 h-4"
                />
              </div>

              <div className="flex gap-2 justify-end mt-auto pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(task);
                  }}
                  className="text-[#34C759] hover:text-[#28a745]"
                  title="Bearbeiten"
                >
                  <FaPen className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(task);
                  }}
                  className="text-[#FF3B30] hover:text-[#c82333]"
                  title="Löschen"
                >
                  <FaTrashAlt className="w-4 h-4" />
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
