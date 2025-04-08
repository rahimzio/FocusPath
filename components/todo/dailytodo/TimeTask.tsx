// components/todo/TaskListTimeBased.tsx

import React from "react";
import { Task } from "@/utils/interface";
import { FaCheckCircle } from "react-icons/fa";
import { getEndTime, getHeightFromDuration } from "@/utils/todo/helper";
interface Props {
  tasks: Task[];
  selectedDate: string;
  handleCheckTask: (taskId: string, date: string, checked: boolean) => void;
  openTaskDetails: (task: Task) => void;
  openEditDialog: (task: Task) => void;
  confirmDelete: (task: Task) => void;
  getHeightFromDuration: (duration: string) => number;
  getEndTime: (start: string, duration: string) => string;
  convertToMinutes: (time: string) => number;
  checkOverlappingTasks: (a: Task, b: Task) => boolean;
}

const TaskListTimeBased: React.FC<Props> = ({
  tasks,
  selectedDate,
  handleCheckTask,
  openTaskDetails,
  openEditDialog,
  confirmDelete,
  getHeightFromDuration,
  getEndTime,
  convertToMinutes,
  checkOverlappingTasks,
}) => {
  const timeTasks = tasks.filter((task) => task.timebased);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-10 text-black">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Aufgaben mit Uhrzeit</h2>

      {timeTasks.length === 0 ? (
        <p className="text-gray-600">Keine zeitbasierten Aufgaben vorhanden.</p>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[300px]">
          {timeTasks
            .sort((a, b) => convertToMinutes(a.time) - convertToMinutes(b.time))
            .map((task, index, array) => {
              const overlaps = array.some(
                (otherTask, i) => i !== index && checkOverlappingTasks(task, otherTask)
              );

              return (
                <div
                  key={task._id}
                  style={{
                    borderLeft: `8px solid ${task.color || "#3B82F6"}`,
                    backgroundColor: overlaps ? "#FFF3F3" : "white",
                    height: task.duration
                      ? `${getHeightFromDuration(task.duration)}px`
                      : "auto",
                    minHeight: "40px",
                  }}
                  className={`p-3 border rounded flex items-center ${
                    task.status === "completed" ? "completed" : ""
                  }`}
                >
                  <div className="flex-grow">
                    {task.goalId && (
                      <p className="text-sm text-blue-600 font-medium mb-1">🎯 Ziel-Aufgabe</p>
                    )}
                    <h4 className="font-semibold">{task.name}</h4>
                    <p>{task.description}</p>
                    {task.time && (
                      <p className="text-sm">
                        <span className="font-medium">Start:</span> {task.time}
                      </p>
                    )}
                    {task.time && task.duration && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Ende:</span>{" "}
                        {getEndTime(task.time, task.duration)}
                      </p>
                    )}
                    {overlaps && (
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ Überschneidet sich mit anderer Aufgabe
                      </p>
                    )}
                  </div>

                  {task.status === "completed" && (
                    <FaCheckCircle className="text-green-500 ml-2" />
                  )}

                  <div className="mt-2 flex items-center">
                    <input
                      id={`timeTaskCheck-${task._id}`}
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={(e) =>
                        handleCheckTask(task._id, selectedDate, e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`timeTaskCheck-${task._id}`}
                      className="ml-2 select-none"
                    >
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
              );
            })}
        </div>
      )}
    </div>
  );
};

export default TaskListTimeBased;
