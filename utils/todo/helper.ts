import { Task,SubTask } from "../interface";
import { toast } from "react-toastify";

export function getHeightFromDuration(duration: string | any): number {
    const [hoursStr, minutesStr] = duration.split(":");
    const hours = parseInt(hoursStr || "0", 10);
    const minutes = parseInt(minutesStr || "0", 10);
    const totalMinutes = hours * 60 + minutes;

    // Min/Max Grenzen setzen
    const minHeight = 48; // z.B. 48px (für 1 Minute)
    const maxHeight = 200; // z.B. 200px (für 2.5 Stunden = 150 Min)

    const clampedMinutes = Math.max(1, Math.min(totalMinutes, 150)); // max. 2,5h
    const scale = (clampedMinutes - 1) / (150 - 1); // 0–1
    return minHeight + scale * (maxHeight - minHeight); // linear interpoliert
  }


  export function getEndTime(start: string, duration: string): string {
    const [startHour, startMinute] = start.split(":").map(Number);
    const [durHour, durMinute] = duration.split(":").map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + durHour);
    endDate.setMinutes(endDate.getMinutes() + durMinute);

    const endHours = endDate.getHours().toString().padStart(2, "0");
    const endMinutes = endDate.getMinutes().toString().padStart(2, "0");

    return `${endHours}:${endMinutes}`;
  }

 export function checkOverlappingTasks(taskA: Task, taskB: Task): boolean {
    if (!taskA.time || !taskA.duration || !taskB.time || !taskB.duration) return false;

    const startA = convertToMinutes(taskA.time);
    const endA = startA + convertToMinutes(taskA.duration);

    const startB = convertToMinutes(taskB.time);
    const endB = startB + convertToMinutes(taskB.duration);

    return startA < endB && startB < endA;
  }

  export function convertToMinutes(time: string): number {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }
  
  export async function deleteEntireSeries(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/task/deleteTask?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success("Aufgabenserie gelöscht.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Löschen der Aufgabenserie.");
      return false;
    }
  }


  export async function handleCheckTask(
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
        body: JSON.stringify({ taskId, date }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        toast.error(
          checked ? "Fehler beim Abschließen der Aufgabe." : "Fehler beim Rückgängigmachen der Aufgabe."
        );
        return;
      }
  
      toast[checked ? "success" : "info"](
        checked ? "Aufgabe erfolgreich abgeschlossen!" : "Aufgabe als offen markiert."
      );
  
      await fetchTasks(date);
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }
  

  export async function handleCheckSubTask(
    task: Task,
    subTaskId: string,
    date: string,
    checked: boolean,
    fetchTasks: (date: string) => Promise<void>,
    updateTaskState: (task: Task) => void
  ) {
    console.log(`handleCheckSubTask: taskId=${task._id}, subTaskId=${subTaskId}, date=${date}, checked=${checked}`);
    try {
      const response = await fetch("/api/task/completeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task._id, subTaskId, date }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Subtask-Abschluss:", errorText);
        toast.error("Fehler beim Abschließen des Subtasks.");
        return;
      }
  
      toast.success("Subtask erfolgreich abgeschlossen!");

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

  import { useCallback } from "react";

interface UseSubtaskCompletionProps  {
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;
  fetchTasks: (date: string) => Promise<void>;
}

export function useSubtaskCompletion({ selectedTask, setSelectedTask, fetchTasks }: UseSubtaskCompletionProps ) {
  const handleCheckSubTask = useCallback(
    async (taskId: string, subTaskId: string, date: string, checked: boolean) => {
      try {
        const response = await fetch("/api/task/completeTask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, subTaskId, date }),
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
    [selectedTask, setSelectedTask, fetchTasks]
  );

  return { handleCheckSubTask };
}


interface Props {
    selectedDate: string;
    fetchTasks: (date: string) => Promise<void>;
    setDeleteDialogOpen: (open: boolean) => void;
    setTaskToDelete: (task: Task | null) => void;
  }

export default function useTaskDeletion({
  selectedDate,
  fetchTasks,
  setDeleteDialogOpen,
  setTaskToDelete,
}: Props) {
  async function deleteSingleInstance(taskId: string, date: string) {
    try {
      const res = await fetch("/api/task/deleteInstance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Instanz erfolgreich ausgeblendet.");
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Ausblenden der Instanz.");
    }
  }

  async function deleteEntireSeries(taskId: string) {
    try {
      const res = await fetch(`/api/task/deleteTask?taskId=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Aufgabenserie gelöscht.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Löschen der Aufgabenserie.");
      return false;
    }
  }

  async function handleDeleteTask(task: Task) {
    if (task.frequency !== "once") {
      const input = window.prompt(`Diese Aufgabe ist wiederkehrend.\n1 = nur heute\n2 = gesamte Serie`);
      if (input === "1") {
        await deleteSingleInstance(task._id, selectedDate);
      } else if (input === "2") {
        await deleteEntireSeries(task._id);
      } else {
        toast.info("Löschen abgebrochen.");
        return;
      }
    } else {
      const confirm = window.confirm("Willst du diese Aufgabe wirklich löschen?");
      if (!confirm) return;
      await deleteEntireSeries(task._id);
    }

    await fetchTasks(selectedDate);
  }

  function confirmDelete(task: Task) {
    if (task.frequency !== "once") {
      setTaskToDelete(task);
      setDeleteDialogOpen(true);
    } else {
      handleDeleteTask(task);
    }
  }

  return { handleDeleteTask, confirmDelete };
}

export async function handleDeleteSeries(
  taskId: string,
  fetchTasks: (date: string) => Promise<void>,
  selectedDate: string,
  setDeleteDialogOpen: (open: boolean) => void
) {
  try {
    const response = await fetch(`/api/task/deleteTask?taskId=${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(await response.text());

    toast.success("Aufgabenserie gelöscht.");
    setDeleteDialogOpen(false);
    await fetchTasks(selectedDate);
  } catch (error) {
    console.error("Fehler beim Löschen der Aufgabenserie:", error);
    toast.error("Fehler beim Löschen der Aufgabenserie.");
  }
}

export function confirmDelete(
  task: Task,
  setTaskToDelete: (task: Task | null) => void,
  setDeleteDialogOpen: (open: boolean) => void,
  handleDeleteSeries: (taskId: string) => void
) {
  if (task.frequency !== "once") {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  } else {
    handleDeleteSeries(task._id);
  }
}
