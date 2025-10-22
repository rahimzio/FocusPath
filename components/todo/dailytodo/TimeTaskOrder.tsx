"use client";

import { Task } from "@/utils/interfaces/task";
import React, { useState } from "react";
import { FaTrashAlt, FaPen } from "react-icons/fa";

interface Props {
  UserId: string;
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
  fetchTasks: (date: string) => Promise<void>;
}

const TaskListTimeBased: React.FC<Props> = ({
  UserId,
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
  fetchTasks,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const timeTasks = tasks.filter((task) => String(task.timebased) === "true" || task.timebased === true);

  const getTimeFromY = (y: number): string => {
    const containerTop = document.getElementById("time-task-list")?.getBoundingClientRect().top || 0;
    const relativeY = y - containerTop;
    const pxPer15Min = 32;
    const minutes = Math.round(relativeY / pxPer15Min) * 15;
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const updateTaskTime = async (taskId: string, newTime: string) => {
    try {
      const res = await fetch(`/api/task/updateTaskTime?taskId=${taskId}&userId=${UserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: newTime }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchTasks(selectedDate);
    } catch (err) {
      console.error("Fehler beim Zeit-Update:", err);
    }
  };

  const getEarliestAndLatestTime = (): [number, number] => {
    const times = timeTasks.map((t) => convertToMinutes(t.time));
    const min = Math.min(...times, 360);
    const max = Math.max(...times, 1320);
    return [min, max];
  };

  const [minTime, maxTime] = getEarliestAndLatestTime();
  const containerHeight = ((maxTime - minTime) / 15) * 32 + 100;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const renderTimeGrid = () => {
    const startHour = Math.floor(minTime / 60);
    const endHour = Math.ceil(maxTime / 60);

    const rows = [];
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        const totalMin = h * 60 + m;
        const isNow = Math.abs(totalMin - nowMinutes) <= 7;
        const isPast = totalMin < nowMinutes;

        rows.push(
          <div
            key={`${h}:${m}`}
            className={`border-t text-xs h-[32px] relative pl-2 ${
              isNow ? "bg-yellow-200" : isPast ? "bg-gray-100" : ""
            }`}
          >
            {m === 0 && (
              <span className="absolute top-[-6px] left-0 text-gray-400 text-[10px]">
                {String(h).padStart(2, "0")}:00
              </span>
            )}
          </div>
        );
      }
    }
    return <div className="w-10 pr-1">{rows}</div>;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow border border-[#e5e5ea] mb-10 text-black">
      <h2 className="text-lg font-semibold text-[#1c1c1e] mb-4">🕒 Zeitlich geplante Aufgaben</h2>
      <div className="flex gap-2 relative">
        {renderTimeGrid()}

        <div
          id="time-task-list"
          className="relative flex-grow border-l overflow-visible"
          style={{ minHeight: `${containerHeight}px` }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const taskId = e.dataTransfer.getData("taskId");
            const newTime = getTimeFromY(e.clientY);
            if (taskId && newTime) updateTaskTime(taskId, newTime);
            setDraggingId(null);
          }}
        >
          {timeTasks.map((task) => {
            const top = ((convertToMinutes(task.time || "00:00") - minTime) / 15) * 32;
            const overlaps = timeTasks.some(
              (t) => t._id !== task._id && checkOverlappingTasks(task, t)
            );

            return (
              <div
                key={task._id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("taskId", task._id);
                  setDraggingId(task._id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => openTaskDetails(task)}
                style={{
                  top: `${top}px`,
                  position: "absolute",
                  width: "100%",
                  height: task.duration ? `${getHeightFromDuration(task.duration)}px` : "auto",
                  minHeight: "48px",
                  borderLeft: `6px solid ${task.color || "#3B82F6"}`,
                  backgroundColor: overlaps ? "#FFF3F3" : "#FAFAFA",
                }}
                className={`rounded-lg border border-[#e5e5ea] p-3 pr-4 flex justify-between items-center gap-4 transition hover:shadow-sm cursor-move ${
                  task.status === "completed" ? "opacity-60" : ""
                } ${draggingId === task._id ? "opacity-40 scale-[.98]" : ""}`}
              >
                <div className="flex flex-col w-full">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-sm font-semibold truncate ${
                        task.status === "completed"
                          ? "line-through text-gray-400"
                          : "text-[#1c1c1e]"
                      }`}
                    >
                      {task.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {task.time || "???"} – {getEndTime(task.time || "00:00", task.duration || "00:15")}
                    </span>
                    <span className="text-[10px] text-gray-400 italic mt-1">
                      Dauer: {task.duration || "15min"}
                    </span>
                  </div>
                  <div className="flex gap-4 items-center pt-2">
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

                <input
                  type="checkbox"
                  checked={task.status === "completed"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleCheckTask(task._id, selectedDate, e.target.checked)}
                  className="accent-[#007AFF] w-5 h-5"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskListTimeBased;
