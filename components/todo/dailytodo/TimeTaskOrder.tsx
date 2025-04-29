// components/todo/TaskListTimeBased.tsx
import React, { useState } from "react";
import { Task } from "@/utils/interface";
import { FaCheckCircle } from "react-icons/fa";

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
    <div className="bg-white p-4 rounded-lg shadow-md mb-10 text-black">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">Aufgaben mit Uhrzeit</h2>
      <div className="flex gap-2 relative">
        {renderTimeGrid()}

        <div
          id="time-task-list"
          className="relative flex-grow h-[700px] border-l"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const taskId = e.dataTransfer.getData("taskId");
            const newTime = getTimeFromY(e.clientY);
            if (!taskId || !newTime || !UserId) return;
            updateTaskTime(taskId, newTime, UserId);

            const updated = [...allTasks].map((t) =>
              t._id === taskId ? { ...t, time: newTime } : t
            );
            updated.sort((a, b) => convertToMinutes(a.time) - convertToMinutes(b.time));
            setLocalTasks(updated);
          }}
        >
          {allTasks.map((task) => {
            const overlaps = allTasks.some(
              (otherTask) =>
                otherTask._id !== task._id && checkOverlappingTasks(task, otherTask)
            );
            const minutesSinceStart = convertToMinutes(task.time) - (getEarliestAndLatestTime(allTasks)[0]);
            const top = (minutesSinceStart / 15) * 10;

            return (
              <div
                key={task._id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("taskId", task._id)}
                style={{
                  top: `${top}px`,
                  left: "0",
                  width: "100%",
                  position: "absolute",
                  borderLeft: `8px solid ${task.color || "#3B82F6"}`,
                  backgroundColor: overlaps ? "#FFF3F3" : "white",
                  height: task.duration ? `${getHeightFromDuration(task.duration)}px` : "auto",
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
                      <span className="font-medium">Ende:</span> {getEndTime(task.time, task.duration)}
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
      </div>
    </div>
  );
};

export default TaskListTimeBased;
