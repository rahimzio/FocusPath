// components/goals/GoalContainerSection.tsx

import React from "react";
import { Goal, Task } from "@/utils/interface";

interface Props {
  title: string;
  goals: Goal[];
  onAddWeekly: (parentGoalId: string) => void;
  onGenerateDaily: (goalId: string) => void;
  onCompleteTask: (goalId: string, taskId: string) => void;
  onOpenSubTaskModal: (task: Task) => void;
  onCompleteSubTask: (task: Task, subTaskId: string, goalId: string) => void;
}

export default function GoalContainerSection({
  title,
  goals,
  onAddWeekly,
  onGenerateDaily,
  onCompleteTask,
  onOpenSubTaskModal,
  onCompleteSubTask,
}: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="bg-white shadow p-4 mb-6 rounded-lg text-gray-800">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>

      {goals.map((goal) => (
        <div key={goal._id} className="border p-3 rounded mb-4 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">{goal.title}</h3>
          <p className="text-sm text-gray-700">{goal.description}</p>
          <p className="text-sm text-gray-600">
            Zeitraum: {goal.startDate} – {goal.endDate}
          </p>
          <p className="text-sm text-gray-600 mb-2">Fortschritt: {goal.progress}%</p>

          {goal.type === "monthly" && (
            <button
              onClick={() => onAddWeekly(goal._id)}
              className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mb-2 mr-2"
            >
              Wochengoal erstellen
            </button>
          )}

          {goal.type === "weekly" && (
            <button
              onClick={() => onGenerateDaily(goal._id)}
              className="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 mb-2"
            >
              4 Tagesaufgaben generieren
            </button>
          )}

          {goal.tasks && Array.isArray(goal.tasks) && goal.tasks.length > 0 ? (
            <div className="ml-2">
              <h4 className="font-semibold mt-2 mb-1">Aufgaben:</h4>
              {goal.tasks.map((task: any) => (
                <div key={task._id} className="border p-2 rounded bg-white mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-800 flex-1">
                      <strong>{task.name}</strong> | Status: {task.status}
                    </span>
                    <div className="space-x-1">
                      {task.status === "incomplete" && (
                        <button
                          onClick={() => onCompleteTask(goal._id, task._id)}
                          className="bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-800 text-xs"
                        >
                          Erledigen
                        </button>
                      )}
                      <button
                        onClick={() => onOpenSubTaskModal(task)}
                        className="bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-xs"
                      >
                        Subtasks verwalten
                      </button>
                    </div>
                  </div>

                  {task.subTasks && task.subTasks.length > 0 && (
                    <div className="ml-3 mt-1 space-y-1">
                      {task.subTasks.map((st: any) => (
                        <div
                          key={st._id}
                          className="bg-yellow-50 border-l-4 border-yellow-300 p-2 text-sm flex items-center"
                        >
                          <span className="flex-1">
                            <strong>{st.name}</strong> ({st.status})
                            {st.dueDate && ` – fällig am ${st.dueDate}`}
                            {st.time && ` um ${st.time}`}
                          </span>
                          {st.status === "incomplete" && (
                            <button
                              onClick={() => onCompleteSubTask(task, st._id!, goal._id)}
                              className="bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 text-xs"
                            >
                              Erledigen
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Keine Aufgaben vorhanden.</p>
          )}
        </div>
      ))}
    </div>
  );
}
