import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Task, SubTask } from "@/utils/interface";

interface Props {
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  selectedDate: string;
  handleCheckSubTask: (
    taskId: string,
    subTaskId: string,
    date: string,
    checked: boolean
  ) => void;
  userId:string;
}

const TaskDetailModal: React.FC<Props> = ({
  userId,
  selectedTask,
  setSelectedTask,
  selectedDate,
  handleCheckSubTask,
}) => {
  if (!selectedTask) return null;

  return (
    <Dialog
      open={!!selectedTask}
      onOpenChange={(open) => setSelectedTask(open ? selectedTask : null)}
    >
      <DialogContent className="bg-white text-black dark:bg-gray-800 dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {selectedTask.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          <p>
            <span className="font-semibold">Punkte:</span> {selectedTask.points}
          </p>
          <p>
            <span className="font-semibold">beschreibung:</span> {selectedTask.description}
          </p>
          <p>
            <span className="font-semibold">Status:</span> {selectedTask.status}
          </p>
          <p>
            <span className="font-semibold">Fällig am:</span>{" "}
            {selectedTask.dueDate}
          </p>
          {selectedTask.time && (
            <p>
              <span className="font-semibold">Uhrzeit:</span>{" "}
              {selectedTask.time}
            </p>
          )}
          {selectedTask.duration && (
            <p>
              <span className="font-semibold">Länge:</span>{" "}
              {selectedTask.duration}
            </p>
          )}
          <p>
            <span className="font-semibold">Kategorie:</span>{" "}
            {selectedTask.category}
          </p>

          {(selectedTask.subTasks ?? []).length > 0 && (
            <div className="mt-4">
              <h4 className="text-lg font-semibold">Subtasks</h4>
              {(selectedTask.subTasks ?? []).map((subTask, index) => (
                <div
                  key={index}
                  className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-3 rounded mt-2"
                >
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`subtask-check-${index}`}
                      checked={subTask.status === "completed"}
                      onChange={(e) =>
                        handleCheckSubTask(
                          selectedTask._id,
                          subTask._id || String(index),
                          selectedDate,
                          e.target.checked
                        )
                      }
                    />
                    <label htmlFor={`subtask-check-${index}`} className="ml-2">
                      {subTask.status === "completed"
                        ? "Abgeschlossen"
                        : "Offen"}
                    </label>
                  </div>
                  <p>
                    <span className="font-semibold">Name:</span> {subTask.name}
                  </p>
                  {subTask.description && (
                    <p>
                      <span className="font-semibold">Beschreibung:</span>{" "}
                      {subTask.description}
                    </p>
                  )}
                  {subTask.points !== undefined && (
                    <p>
                      <span className="font-semibold">Punkte:</span>{" "}
                      {subTask.points}
                    </p>
                  )}
                  {subTask.dueDate && (
                    <p>
                      <span className="font-semibold">Fälligkeitsdatum:</span>{" "}
                      {subTask.dueDate}
                    </p>
                  )}
                  {subTask.time && (
                    <p>
                      <span className="font-semibold">Uhrzeit:</span>{" "}
                      {subTask.time}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailModal;
