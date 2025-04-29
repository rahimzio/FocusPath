// 📁 utils/todo/taskUtils.ts
import { Task } from "@/utils/interface";
import { toast } from "react-toastify";

/**
 * Konvertiert eine Dauer (HH:MM) in eine visuelle Höhe (z. B. für Kalenderansicht)
 */
export function getHeightFromDuration(duration: string): number {
  const [hoursStr, minutesStr] = duration.split(":");
  const hours = parseInt(hoursStr || "0", 10);
  const minutes = parseInt(minutesStr || "0", 10);
  const totalMinutes = hours * 60 + minutes;
  const minHeight = 48;
  const maxHeight = 200;
  const clamped = Math.max(1, Math.min(totalMinutes, 150));
  const scale = (clamped - 1) / (150 - 1);
  return minHeight + scale * (maxHeight - minHeight);
}

/**
 * Gibt das Endzeitformat basierend auf Startzeit + Dauer zurück
 */
export function getEndTime(start: string, duration: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [dh, dm] = duration.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(sh, sm, 0, 0);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + dh);
  endDate.setMinutes(endDate.getMinutes() + dm);
  return `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Wandelt Uhrzeit in Minuten um
 */

export function convertToMinutes(time: string | null | undefined): number {
  if (!time || typeof time !== "string") return 0;
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}


/**
 * Prüft, ob sich zwei Aufgaben zeitlich überschneiden
 */
export function checkOverlappingTasks(taskA: Task, taskB: Task): boolean {
  if (!taskA.time || !taskA.duration || !taskB.time || !taskB.duration) return false;
  const startA = convertToMinutes(taskA.time);
  const endA = startA + convertToMinutes(taskA.duration);
  const startB = convertToMinutes(taskB.time);
  const endB = startB + convertToMinutes(taskB.duration);
  return startA < endB && startB < endA;
}

/**
 * Führt das vollständige Löschen einer Serie durch (inkl. Fehlerbehandlung)
 */
export async function deleteEntireSeries(userId: string, taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/task/deleteTask?taskId=${taskId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error(await response.text());
    toast.success("Aufgabenserie gelöscht.");
    return true;
  } catch (err) {
    console.error("Fehler beim Löschen der Aufgabenserie:", err);
    toast.error("Fehler beim Löschen der Aufgabenserie.");
    return false;
  }
}

/**
 * Aktualisiert den Status einer Aufgabe auf "completed" oder "incomplete"
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
