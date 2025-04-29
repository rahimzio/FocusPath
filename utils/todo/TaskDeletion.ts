// 📁 useTaskDeletion.ts
import { Task } from "../interface";
import { toast } from "react-toastify";

interface Props {
  selectedDate: string;
  fetchTasks: (date: string) => Promise<void>;
  setDeleteDialogOpen: (open: boolean) => void;
  setTaskToDelete: (task: Task | null) => void;
}
export async function deleteSingleInstance(userId: string, taskId: string, date: string) {
  try {
    const res = await fetch("/api/task/deleteInstance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, date, userId }),
    });
    if (!res.ok) throw new Error(await res.text());
    toast.success("Instanz erfolgreich ausgeblendet.");
  } catch (err) {
    console.error(err);
    toast.error("Fehler beim Ausblenden der Instanz.");
  }
}
export default function useTaskDeletion({
  selectedDate,
  fetchTasks,
  setDeleteDialogOpen,
  setTaskToDelete,
}: Props) {
  // 🔸 Lösche einzelne Instanz einer wiederkehrenden Aufgabe
   async function deleteSingleInstance(userId: string, taskId: string, date: string) {
    try {
      const res = await fetch("/api/task/deleteInstance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, date, userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Instanz erfolgreich ausgeblendet.");
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Ausblenden der Instanz.");
    }
  }

  // 🔸 Lösche gesamte Aufgabenserie
  async function deleteEntireSeries(userId: string, taskId: string) {
    try {
      const res = await fetch(`/api/task/deleteTask?taskId=${taskId}&userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Aufgabenserie gelöscht.");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Fehler beim Löschen der Aufgabenserie.");
      return false;
    }
  }

  // 🔸 Aufgabenlöschung mit Dialog & Entscheidung
  async function handleDeleteTask(task: Task) {
    if (task.frequency !== "once" && task.userId) {
      const input = window.prompt("Diese Aufgabe ist wiederkehrend.\n1 = nur heute\n2 = gesamte Serie");
      if (input === "1") {
        await deleteSingleInstance(task.userId, task._id, selectedDate);
      } else if (input === "2") {
        await deleteEntireSeries(task.userId, task._id);
      } else {
        toast.info("Löschen abgebrochen.");
        return;
      }
    } else {
      const confirm = window.confirm("Willst du diese Aufgabe wirklich löschen?");
      if (!confirm || !task.userId) return;
      await deleteEntireSeries(task.userId, task._id);
    }

    await fetchTasks(selectedDate);
  }

  // 🔸 Dialog für Wiederholungsaufgaben öffnen
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

// 🔸 Exportiere auch als Named Function falls direkt importiert werden soll
export async function handleDeleteSeries(
  userId:string,
  taskId: string,
  fetchTasks: (date: string) => Promise<void>,
  selectedDate: string,
  setDeleteDialogOpen: (open: boolean) => void
) {
  try {
    const response = await fetch(`/api/task/deleteTask?taskId=${taskId}&userId=${userId}`, {
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

export function confirmDeleteWithSeries(
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
