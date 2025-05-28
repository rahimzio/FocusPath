// 📁 utils/todo/taskUtils.ts
import { Task } from "@/utils/interface";
import { toast } from "react-toastify";

/**
 * Konvertiert eine Dauer (HH:MM) in eine visuelle Höhe (z. B. für Kalenderansicht)
 */
export function getHeightFromDuration(duration: string): number {
  if (!duration || !duration.includes(":")) {
    duration = "00:15"; // fallback auf 15 Minuten
  }
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
  const startMinutes = convertToMinutes(start);
const durationMinutes = convertToMinutes(duration || "00:15");
  const totalMinutes = startMinutes + durationMinutes;
  const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Wandelt Uhrzeit in Minuten um
 */

export function convertToMinutes(time: string | undefined | null): number {
  if (!time || typeof time !== "string" || !time.includes(":")) return 0;
  const [h, m] = time.split(":");
  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
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
