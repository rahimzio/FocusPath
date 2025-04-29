// 🧩 taskStatus.ts – Funktionen zum Abschließen/Rückgängigmachen von Tasks und Subtasks
import { useCallback } from "react";
import { Task, SubTask } from "../interface";
import { toast } from "react-toastify";

/**
 * Aktualisiert den Status einer Aufgabe (checked = true → abgeschlossen)
 */
export async function handleCheckTask(
  userId: string,
  taskId: string,
  date: string,
  checked: boolean,
  fetchTasks: (date: string) => Promise<void>
) {
  try {
    const endpoint = checked ? "/api/task/completeTask" : "/api/task/undoCompletion";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, date, userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend-Fehler:", errorText);
      toast.error(checked ? "Fehler beim Abschließen." : "Fehler beim Rückgängigmachen.");
      return;
    }

    toast[checked ? "success" : "info"](
      checked ? "Aufgabe abgeschlossen!" : "Aufgabe als offen markiert."
    );
    await fetchTasks(date);
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Status:", error);
    toast.error("Ein unerwarteter Fehler ist aufgetreten.");
  }
}

/**
 * Aktualisiert den Status eines Subtasks
 */
export async function handleCheckSubTask(
  userId: string,
  task: Task,
  subTaskId: string,
  date: string,
  checked: boolean,
  fetchTasks: (date: string) => Promise<void>,
  updateTaskState: (task: Task) => void
) {
  try {
    const response = await fetch("/api/task/completeTask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task._id, subTaskId, date, userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fehler beim Subtask-Abschluss:", errorText);
      toast.error("Fehler beim Abschließen des Subtasks.");
      return;
    }

    toast.success("Subtask abgeschlossen!");

    const updatedSubTasks = task.subTasks?.map((sub) => {
      if (sub._id === subTaskId) {
        const newStatus: SubTask["status"] = checked ? "completed" : "incomplete";
        return { ...sub, status: newStatus };
      }
      return sub;
    });

    const allSubTasksCompleted = updatedSubTasks?.every((st) => st.status === "completed");

    updateTaskState({
      ...task,
      subTasks: updatedSubTasks,
      status: allSubTasksCompleted ? "completed" : task.status,
    });

    await fetchTasks(date);
  } catch (err) {
    console.error("Fehler bei handleCheckSubTask:", err);
    toast.error("Ein unerwarteter Fehler ist aufgetreten.");
  }
}


interface UseSubtaskCompletionProps {
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    fetchTasks: (date: string) => Promise<void>;
    userId: string;
  }
  
  export function useSubtaskCompletion({ selectedTask, setSelectedTask, fetchTasks, userId }: UseSubtaskCompletionProps) {
    const handleCheckSubTask = useCallback(
      async (taskId: string, subTaskId: string, date: string, checked: boolean) => {
        try {
          const response = await fetch("/api/task/completeTask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId, subTaskId, date, userId }),
          });
  
          if (!response.ok) {
            const errorText = await response.text();
            toast.error("Fehler beim Abschließen des Subtasks.");
            console.error(errorText);
            return;
          }
  
          toast.success("Subtask erfolgreich abgeschlossen!");
  
          if (selectedTask && selectedTask._id === taskId) {
            const updatedSubTasks = selectedTask.subTasks?.map((subTask) => {
              if (subTask._id === subTaskId) {
                const newStatus: SubTask["status"] = checked ? "completed" : "incomplete";
                return { ...subTask, status: newStatus };
              }
              return subTask;
            });
  
            const allCompleted = updatedSubTasks?.every((st) => st.status === "completed");
            setSelectedTask({
              ...selectedTask,
              subTasks: updatedSubTasks,
              status: allCompleted ? "completed" : selectedTask.status,
            });
          }
  
          await fetchTasks(date);
        } catch (error) {
          console.error("Fehler beim Subtask-Update:", error);
          toast.error("Ein unerwarteter Fehler ist aufgetreten.");
        }
      },
      [selectedTask, setSelectedTask, fetchTasks, userId]
    );
  
    return { handleCheckSubTask };
  }