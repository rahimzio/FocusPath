import React, { useState } from "react";
import { Task } from "@/utils/interface";
import { FaCheckCircle, FaTrashAlt, FaPen } from "react-icons/fa";
import { getEndTime, getHeightFromDuration } from "@/utils/todo/taskUtils";

interface Props {
  UserId:string;
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
  const [localTasks, setLocalTasks] = useState<Task[]>([]);

  const timeTasks = tasks.filter((task) => task.timebased);
  const allTasks = localTasks.length > 0 ? localTasks : timeTasks;

  const getTimeFromY = (y: number): string => {
    const containerTop = document.getElementById("time-task-list")?.getBoundingClientRect().top || 0;
    const relativeY = y - containerTop;
    const pxPer15Min = 10;
    const minutes = Math.round(relativeY / pxPer15Min) * 15;
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    return `${hours}:${mins}`;
  };

  const updateTaskTime = async (taskId: string, newTime: string, userId: string) => {
    try {
      const res = await fetch(`/api/task/updateTaskTime?taskId=${taskId}&userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: newTime }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchTasks(selectedDate);
    } catch (err) {
      console.error("Fehler beim Zeit-Update via Drag & Drop:", err);
    }
  };

  const getEarliestAndLatestTime = (tasks: Task[]): [number, number] => {
    const times = tasks.map((t) => convertToMinutes(t.time));
    const min = Math.min(...times, 360); // 360 = 6:00
    const max = Math.max(...times, 1320); // 1320 = 22:00
    return [min, max];
  };

  const renderTimeGrid = () => {
    const [minTime, maxTime] = getEarliestAndLatestTime(allTasks);
    const startHour = Math.floor(Math.min(minTime, 360) / 60);
    const endHour = Math.ceil(Math.max(maxTime, 1320) / 60);

    const rows = [];
    for (let h = startHour; h <= endHour; h++) {
      for (let m = 0; m < 60; m += 15) {
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        rows.push(
          <div key={timeStr} className="border-t border-gray-200 text-xs text-gray-500 h-[10px] pl-2 relative">
            {m === 0 && <div className="absolute left-0 top-[-6px]">{timeStr}</div>}
          </div>
        );
      }
    }
    return <div className="w-20 pr-2 relative">{rows}</div>;
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow border border-[#e5e5ea] mb-10 text-black">
      <h2 className="text-lg font-semibold text-[#1c1c1e] mb-4">🕒 Zeitlich geplante Aufgaben</h2>

      {timeTasks.length === 0 ? (
        <p className="text-gray-500">Keine zeitbasierten Aufgaben vorhanden.</p>
      ) : (
        <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2">
          {timeTasks
            .sort((a, b) => convertToMinutes(a.time) - convertToMinutes(b.time))
            .map((task, index, array) => {
              const overlaps = array.some(
                (otherTask, i) => i !== index && checkOverlappingTasks(task, otherTask)
              );

              return (
                <div
                key={task._id}
                onClick={() => openTaskDetails(task)}
                className={`w-full flex flex-col sm:flex-row justify-between gap-3 p-3 rounded-lg border border-[#e5e5ea] bg-[#FAFAFA] hover:shadow transition cursor-pointer ${task.status === "completed" ? "opacity-60 line-through" : ""}`}
                style={{
                  borderLeft: `6px solid ${task.color || "#3B82F6"}`,
                  backgroundColor: overlaps ? "#FFF3F3" : "#FAFAFA",
                  height: task.duration ? `${getHeightFromDuration(task.duration)}px` : "auto",
                  minHeight: "56px",
                }}
              >
                {/* Linker Block: Text + Buttons */}
                <div className="flex flex-col w-full max-w-full overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-[#1c1c1e] break-words truncate">{task.name}</span>
                    <span className="text-xs text-gray-500">
                      {task.time} – {task.duration ? getEndTime(task.time, task.duration) : "?"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(task);
                      }}
                      className="text-[#34C759] hover:text-[#28a745] text-sm"
                      title="Bearbeiten"
                    >
                      ✏️ Bearbeiten
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(task);
                      }}
                      className="text-[#FF3B30] hover:text-[#c82333] text-sm"
                      title="Löschen"
                    >
                      🗑️ Löschen
                    </button>
                  </div>
                </div>
              
                {/* Rechte Seite: Checkbox */}
                <div className="flex items-center justify-end sm:pl-4">
                  <input
                    type="checkbox"
                    checked={task.status === "completed"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleCheckTask(task._id, selectedDate, e.target.checked)}
                    className="accent-[#007AFF] w-5 h-5"
                  />
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
