"use client";

import { useState, useEffect } from "react";
import { Task, GoalWithProgress, SubTask } from "@/utils/interface"; // Stelle sicher, dass SubTask hier importiert wird
import SheetWithCreateTask from "@/components/todo/popUpCreateTask";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Calendar from "react-calendar";
import { Value } from "react-calendar/dist/esm/shared/types.js";
import { FaCheckCircle, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import ProgressBar from "./todo/ProgressBar";

// Hilfsfunktion, um ein Date-Objekt als YYYY-MM-DD zu formatieren
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DailyTaskList = () => {
  // Liste der Tasks und Ziele, die wir vom Server bekommen
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);

  // Kalender-Logik
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));

  // Detail-Ansicht & Edit-Dialog
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [editedGoal, setEditedGoal] = useState<GoalWithProgress | null>(null);
  const [isGoalEditDialogOpen, setIsGoalEditDialogOpen] = useState(false);

  // ------------------------------------------------
  // 1) fetchTasks => holt gefilterte Tasks vom Server
  // ------------------------------------------------
  async function fetchTasks(dateParam?: string) {
    const dateToUse = dateParam || formatDate(new Date());
    console.log(`Fetching tasks for date: ${dateToUse}`);

    try {
      const response = await fetch(`/api/task/getTasks?date=${dateToUse}`);
      console.log("Response von getTasks:", response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Tasks:", errorText);
        toast.error("Fehler beim Abrufen der Aufgaben.");
        return;
      }

      const data = await response.json();
      console.log("Daten von getTasks:", JSON.stringify(data, null, 2));
      const fetchedTasks: Task[] = data.tasks || [];
      setTasks(fetchedTasks);
      console.log("Aktualisierte Tasks im State:", fetchedTasks);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fehler beim Abrufen der Aufgaben.");
    }
  }

  // ------------------------------------------------
  // 2) fetchGoals => holt alle Ziele vom Server
  // ------------------------------------------------
  /*
  async function fetchGoals() {
    try {
      const response = await fetch("/api/goals/getGoalsWithProgress");
      console.log("Response von getGoalsWithProgress:", response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Ziele:", errorText);
        toast.error("Fehler beim Abrufen der Ziele.");
        return;
      }

      const data = await response.json();
      console.log("Daten von getGoalsWithProgress:", JSON.stringify(data, null, 2));
      const fetchedGoals: GoalWithProgress[] = data.goals || [];
      setGoals(fetchedGoals);
      console.log("Aktualisierte Ziele im State:", fetchedGoals);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Fehler beim Abrufen der Ziele.");
    }
  }*/

  // ------------------------------------------------
  // 3) Handle Check/Uncheck für Hauptaufgaben
  // ------------------------------------------------
  async function handleCheckTask(taskId: string, date: string, checked: boolean) {
    console.log(`handleCheckTask aufgerufen mit: taskId=${taskId}, date=${date}, checked=${checked}`);
    try {
      if (checked) {
        const response = await fetch("/api/task/completeTask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, date }),
        });
        console.log("Response von completeTask:", response);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fehler bei completeTask:", errorText);
          toast.error("Fehler beim Abschließen der Aufgabe.");
          return;
        } else {
          toast.success("Aufgabe erfolgreich abgeschlossen!");
        }
      } else {
        const response = await fetch("/api/task/undoCompletion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, date }),
        });
        console.log("Response von undoCompletion:", response);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Fehler bei undoCompletion:", errorText);
          toast.error("Fehler beim Rückgängigmachen der Aufgabe.");
          return;
        } else {
          toast.info("Aufgabe als offen markiert.");
        }
      }
      await fetchTasks(date);
      //await fetchGoals();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 3️⃣ Handle Check/Uncheck für Subtasks
  // ------------------------------------------------
  async function handleCheckSubTask(taskId: string, subTaskId: string, date: string, checked: boolean) {
    console.log(`handleCheckSubTask aufgerufen mit: taskId=${taskId}, subTaskId=${subTaskId}, date=${date}, checked=${checked}`);
    try {
      // API-Aufruf: Hier wird auch subTaskId übergeben
      const response = await fetch("/api/task/completeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, subTaskId, date }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Abschließen des Subtasks:", errorText);
        toast.error("Fehler beim Abschließen des Subtasks.");
        return;
      }
      toast.success("Subtask erfolgreich abgeschlossen!");

      // Direkte UI-Aktualisierung: Aktualisiere den Status des entsprechenden Subtasks im localen State
      if (selectedTask && selectedTask._id === taskId) {
        const updatedSubTasks = selectedTask.subTasks?.map((subTask) => {
          if (subTask._id === subTaskId) {
            // Definiere den neuen Status als Union-Literal-Typ
            const newStatus: "completed" | "incomplete" = checked ? "completed" : "incomplete";
            return { ...subTask, status: newStatus };
          }
          return subTask;
        });
        // Prüfe, ob alle Subtasks abgeschlossen sind
        const allSubTasksCompleted = updatedSubTasks
          ? updatedSubTasks.every((st) => st.status === "completed")
          : false;
        // Falls ja, setze auch den Status der Hauptaufgabe auf "completed"
        setSelectedTask({
          ...selectedTask,
          subTasks: updatedSubTasks,
          status: allSubTasksCompleted ? "completed" : selectedTask.status,
        });
      }
      
      // Optionale Aktualisierung der Gesamt-Taskliste und Ziele
      await fetchTasks(date);
      //await fetchGoals();
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Subtask-Status:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 4) Aufgaben löschen
  // ------------------------------------------------
  async function handleDeleteTask(taskId: string) {
    if (!confirm("Willst du diese Aufgabe wirklich löschen?")) return;

    console.log(`handleDeleteTask aufgerufen mit: taskId=${taskId}`);

    try {
      const response = await fetch(`/api/task/deleteTask?taskId=${taskId}`, {
        method: "DELETE",
      });
      console.log("Response von deleteTask:", response);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fehler beim Löschen der Task:", errorText);
        toast.error("Löschen fehlgeschlagen.");
        return;
      }
      await fetchTasks(selectedDate);
      toast.success("Aufgabe erfolgreich gelöscht.");
    } catch (error) {
      console.error("Fehler beim Löschen der Task:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 5) useEffect => beim ersten Laden und bei Änderung von selectedDate
  // ------------------------------------------------
  useEffect(() => {
    fetchTasks(selectedDate);
    //fetchGoals();
  }, [selectedDate]);

  // ------------------------------------------------
  // 6) Kalender-Logik
  // ------------------------------------------------
  function handleDateChange(dateValue: Value) {
    if (dateValue instanceof Date) {
      const formattedDate = formatDate(dateValue);
      console.log(`Datum geändert auf: ${formattedDate}`);
      setSelectedDate(formattedDate);
      setShowCalendar(false);
    }
  }

  // ------------------------------------------------
  // 7) Task-Editieren
  // ------------------------------------------------
  async function handleEditTask(event: React.FormEvent) {
    event.preventDefault();
    if (!editedTask || !editedTask._id) {
      console.error("Keine Task ausgewählt");
      toast.error("Keine Aufgabe ausgewählt zum Bearbeiten.");
      return;
    }
    console.log("handleEditTask aufgerufen mit:", editedTask);
    try {
      const response = await fetch(`/api/task/updateTask?taskId=${editedTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedTask.name,
          description: editedTask.description,
          points: editedTask.points,
          dueDate: editedTask.dueDate,
          time: editedTask.time,
          frequency: editedTask.frequency,
          category: editedTask.category,
        }),
      });
      console.log("Response von updateTask:", response);
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Fehler beim Bearbeiten:", errorMessage);
        toast.error("Fehler beim Bearbeiten der Aufgabe.");
        return;
      }
      setEditedTask(null);
      setSelectedTask(null);
      await fetchTasks(selectedDate);
     // await fetchGoals();
      toast.success("Aufgabe erfolgreich bearbeitet!");
    } catch (error) {
      console.error("Fehler beim Bearbeiten:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 8) Detail-Ansicht öffnen
  // ------------------------------------------------
  function openTaskDetails(task: Task) {
    console.log("openTaskDetails aufgerufen mit:", task);
    setSelectedTask(task);
  }

  // ------------------------------------------------
  // 9) Edit-Dialog öffnen
  // ------------------------------------------------
  function openEditDialog(task: Task) {
    console.log("openEditDialog aufgerufen mit:", task);
    setEditedTask(task);
  }

  // ------------------------------------------------
  // 10) Ziel-Editieren
  // ------------------------------------------------
  async function handleEditGoal(event: React.FormEvent) {
    event.preventDefault();
    if (!editedGoal || !editedGoal._id) {
      console.error("Kein Ziel ausgewählt");
      toast.error("Kein Ziel ausgewählt zum Bearbeiten.");
      return;
    }
    console.log("handleEditGoal aufgerufen mit:", editedGoal);
    try {
      const response = await fetch(`/api/goal/updateGoal?goalId=${editedGoal._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editedGoal.title,
          description: editedGoal.description,
        }),
      });
      console.log("Response von updateGoal:", response);
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error("Fehler beim Bearbeiten des Ziels:", errorMessage);
        toast.error("Fehler beim Bearbeiten des Ziels.");
        return;
      }
      setEditedGoal(null);
      setIsGoalEditDialogOpen(false);
      //await fetchGoals();
      toast.success("Ziel erfolgreich bearbeitet!");
    } catch (error) {
      console.error("Fehler beim Bearbeiten des Ziels:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  // ------------------------------------------------
  // 11) Ziel-Editieren Dialog öffnen
  // ------------------------------------------------
  function openEditGoalDialog(goal: GoalWithProgress) {
    console.log("openEditGoalDialog aufgerufen mit:", goal);
    setEditedGoal(goal);
    setIsGoalEditDialogOpen(true);
  }

  // ------------------------------------------------
  // 12) Fortschrittsanzeige rendern
  // ------------------------------------------------
  const renderGoalsWithProgress = () => {
    if (goals.length === 0) {
      return <p className="text-gray-600">Keine Ziele vorhanden.</p>;
    }

    return (
      <div className="bg-green-100 p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Ziele mit Fortschritt</h2>
        <div className="space-y-4 overflow-y-auto max-h-[400px]">
          {goals.map((goal) => (
            <div key={goal._id} className="p-3 border rounded-lg bg-white">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{goal.title}</h3>
                <button
                  onClick={() => openEditGoalDialog(goal)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  <FaEdit />
                </button>
              </div>
              <p className="text-gray-600 mb-2">{goal.description}</p>
              <ProgressBar progress={goal.progress} />
              <p className="mt-1 text-sm text-gray-700">
                {goal.completedTasks} von {goal.totalTasks} Aufgaben abgeschlossen ({goal.progress}%)
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Datum + Kalender */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-4">
          <div
            className="cursor-pointer font-semibold text-lg"
            onClick={() => {
              console.log("Kalender anzeigen/verstecken");
              setShowCalendar(!showCalendar);
            }}
          >
            {selectedDate
              ? `Gewähltes Datum: ${new Date(selectedDate).toLocaleDateString("de-DE")}`
              : `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}`}
          </div>
          {selectedDate !== formatDate(new Date()) && (
            <button
              onClick={() => {
                const today = formatDate(new Date());
                console.log("Zurück auf heutigen Tag, heute:", today);
                setSelectedDate(today);
              }}
              className="ml-4 px-2 py-1 bg-green-500 text-white rounded"
            >
              Heute auswählen
            </button>
          )}
        </div>
        {showCalendar && (
          <Calendar
            onChange={handleDateChange}
            value={new Date(selectedDate)}
            tileClassName={({ date, view }) => {
              if (view === "month") {
                const formattedDate = formatDate(date);
                const hasTasks = tasks.some((task) => task.dueDate === formattedDate);
                return hasTasks ? "bg-blue-200 rounded-full" : "";
              }
              return "";
            }}
          />
        )}
      </div>

      {/* Fortschrittsanzeige für Ziele */}
      {renderGoalsWithProgress()}

      {/* Aufgaben ohne Uhrzeit */}
      <div className="bg-gray-100 p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben ohne Uhrzeit
        </h2>
        {tasks.filter((task) => !task.timebased).length === 0 ? (
          <p className="text-gray-600">Keine Aufgaben ohne Uhrzeit vorhanden.</p>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {tasks.filter((task) => !task.timebased).map((task) => (
              <div
                key={task._id}
                className={`p-3 border rounded flex items-center ${
                  task.status === "completed" ? "completed" : ""
                }`}
              >
                <div className="flex-grow">
                  <h4 className="font-semibold">{task.name}</h4>
                  <p>{task.description}</p>
                </div>
                {task.status === "completed" && (
                  <FaCheckCircle className="text-green-500 ml-2" />
                )}
                <div className="mt-2 flex items-center">
                  <input
                    id={`taskCheck-${task._id}`}
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={(e) =>
                      handleCheckTask(task._id, selectedDate, e.target.checked)
                    }
                  />
                  <label htmlFor={`taskCheck-${task._id}`} className="ml-2 select-none">
                    {task.status === "completed" ? "Abgeschlossen" : "Offen"}
                  </label>
                </div>
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
                    onClick={() => handleDeleteTask(task._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Aufgaben mit Uhrzeit */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Aufgaben mit Uhrzeit
        </h2>
        {tasks.filter((task) => task.timebased).length === 0 ? (
          <p className="text-gray-600">
            Keine zeitbasierten Aufgaben vorhanden.
          </p>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {tasks.filter((task) => task.timebased).map((task) => (
              <div
                key={task._id}
                className={`p-3 border rounded flex items-center ${
                  task.status === "completed" ? "completed" : ""
                }`}
              >
                <div className="flex-grow">
                  <h4 className="font-semibold">{task.name}</h4>
                  <p>{task.description}</p>
                  {task.time && (
                    <p className="text-sm">
                      <span className="font-medium">Uhrzeit:</span> {task.time}
                    </p>
                  )}
                </div>
                {task.status === "completed" && (
                  <FaCheckCircle className="text-green-500 ml-2" />
                )}
                <div className="mt-2 flex items-center">
                  <input
                    id={`timeTaskCheck-${task._id}`}
                    type="checkbox"
                    checked={task.status === "completed"}
                    onChange={(e) =>
                      handleCheckTask(task._id, selectedDate, e.target.checked)
                    }
                  />
                  <label htmlFor={`timeTaskCheck-${task._id}`} className="ml-2 select-none">
                    {task.status === "completed" ? "Abgeschlossen" : "Offen"}
                  </label>
                </div>
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
                    onClick={() => handleDeleteTask(task._id)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fortschrittsanzeige für Ziele */}
      {renderGoalsWithProgress()}

      {/* Detail-Popup für Aufgaben inklusive Subtasks */}
      {selectedTask && (
        <Dialog
          open={Boolean(selectedTask)}
          onOpenChange={(open) => setSelectedTask(open ? selectedTask : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTask.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              <p>{selectedTask.description}</p>
              <p>
                <span className="font-semibold">Punkte:</span> {selectedTask.points}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {selectedTask.status}
              </p>
              <p>
                <span className="font-semibold">Fällig am:</span> {selectedTask.dueDate}
              </p>
              {selectedTask.time && (
                <p>
                  <span className="font-semibold">Uhrzeit:</span> {selectedTask.time}
                </p>
              )}
              <p>
                <span className="font-semibold">Kategorie:</span> {selectedTask.category}
              </p>
              {/* Anzeige der Subtasks mit Checkbox */}
              {selectedTask.subTasks && selectedTask.subTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-lg font-semibold">Subtasks</h4>
                  {selectedTask.subTasks.map((subTask: SubTask, index: number) => (
                    <div key={index} className="border p-2 rounded mt-2">
                      <div className="flex items-center">
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
                          {subTask.status === "completed" ? "Abgeschlossen" : "Offen"}
                        </label>
                      </div>
                      <p>
                        <span className="font-semibold">Name:</span> {subTask.name}
                      </p>
                      {subTask.description && (
                        <p>
                          <span className="font-semibold">Beschreibung:</span> {subTask.description}
                        </p>
                      )}
                      {subTask.points !== undefined && (
                        <p>
                          <span className="font-semibold">Punkte:</span> {subTask.points}
                        </p>
                      )}
                      {subTask.dueDate && (
                        <p>
                          <span className="font-semibold">Fälligkeitsdatum:</span> {subTask.dueDate}
                        </p>
                      )}
                      {subTask.time && (
                        <p>
                          <span className="font-semibold">Uhrzeit:</span> {subTask.time}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit-Popup für Aufgaben */}
      {editedTask && (
        <Dialog
          open={Boolean(editedTask)}
          onOpenChange={(open) => setEditedTask(open ? editedTask : null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aufgabe bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditTask} className="mt-4 space-y-4 text-black">
              <input
                type="text"
                value={editedTask.name}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, name: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Aufgabenname"
                required
              />
              <textarea
                value={editedTask.description}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, description: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Beschreibung"
                required
              />
              <input
                type="number"
                value={editedTask.points}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    points: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Punkte"
                min={0}
                required
              />
              <input
                type="date"
                value={editedTask.dueDate}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, dueDate: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                required
              />
              <input
                type="time"
                value={editedTask.time ?? ""}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, time: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
              />
              <select
                value={editedTask.frequency}
                onChange={(e) =>
                  setEditedTask({
                    ...editedTask,
                    frequency: e.target.value as Task["frequency"],
                  })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                required
              >
                <option value="once">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>
              <input
                type="text"
                value={editedTask.category}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, category: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Kategorie"
                required
              />
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Speichern
              </button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit-Popup für Ziele */}
      {editedGoal && (
        <Dialog
          open={isGoalEditDialogOpen}
          onOpenChange={(open) => setIsGoalEditDialogOpen(open)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ziel bearbeiten</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditGoal} className="mt-4 space-y-4">
              <input
                type="text"
                value={editedGoal.title}
                onChange={(e) =>
                  setEditedGoal({ ...editedGoal, title: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Zieltitel"
                required
              />
              <textarea
                value={editedGoal.description}
                onChange={(e) =>
                  setEditedGoal({ ...editedGoal, description: e.target.value })
                }
                className="p-2 border border-gray-300 rounded-md w-full"
                placeholder="Zielbeschreibung"
                required
              />
              <button
                type="submit"
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Speichern
              </button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Button zum Erstellen einer neuen Aufgabe */}
      <SheetWithCreateTask />
    </div>
  );
};

export default DailyTaskList;
