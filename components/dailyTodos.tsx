"use client";

import { useState, useEffect } from "react";
import { Task, GoalWithProgress, SubTask } from "@/utils/interface"; // Stelle sicher, dass SubTask hier importiert wird
import SheetWithCreateTask from "@/components/todo/PopUpCreateTask";
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
import DeleteRecurringTaskDialog from "./todo/DeleteRecurringTask";
import CalendarSelector from "./todo/dailytodo/CalenderSelector";
import NoTimeTaskList from "./todo/dailytodo/NoTimeTaskList";
import TimeTaskList from "./todo/dailytodo/TimeTask";
import useTaskDeletion, { checkOverlappingTasks, convertToMinutes, deleteEntireSeries, getEndTime, getHeightFromDuration } from "@/utils/todo/helper";
import TaskListTimeBased from "./todo/dailytodo/TimeTask";
import TaskDetailModal from "./todo/dailytodo/TaskDetail";
import TaskEditModal from "./todo/dailytodo/TaskEdit";
import GoalEditModal from "./todo/dailytodo/GoalEdit";
import { handleCheckTask as handleCheckTaskExternal } from "@/utils/todo/helper";
import { handleCheckSubTask as handleCheckSubTaskExternal, useSubtaskCompletion, handleDeleteSeries, confirmDelete } from "@/utils/todo/helper";

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


  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [dayScore, setDayScore] = useState<string>("-");

  async function fetchTasks(dateParam?: string) {
    const dateToUse = dateParam || formatDate(new Date());
    try {
      const response = await fetch(`/api/task/getTasks?date=${dateToUse}`);
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      setTasks([...data.groupedTasks.goalTasks, ...data.groupedTasks.otherTasks]);
      const allTasks = [...data.groupedTasks.goalTasks, ...data.groupedTasks.otherTasks];
      setTasks(allTasks);
      setDayScore(calculateDayScore(allTasks, goals));
    } catch (error) {
      console.error("Fehler beim Abrufen der Aufgaben:", error);
      toast.error("Fehler beim Abrufen der Aufgaben.");
    }
  }

  const { handleCheckSubTask } = useSubtaskCompletion({ selectedTask, setSelectedTask, fetchTasks });
  const { handleDeleteTask, confirmDelete } = useTaskDeletion({ selectedDate, fetchTasks, setDeleteDialogOpen, setTaskToDelete });

  useEffect(() => { fetchTasks(selectedDate); }, [selectedDate]);

  async function handleEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editedTask || !editedTask._id) return toast.error("Keine Aufgabe ausgewählt zum Bearbeiten.");
    try {
      const response = await fetch(`/api/task/updateTask?taskId=${editedTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedTask)
      });
      if (!response.ok) throw new Error(await response.text());
      setEditedTask(null); setSelectedTask(null);
      await fetchTasks(selectedDate);
      toast.success("Aufgabe erfolgreich bearbeitet!");
    } catch (error) {
      console.error("Fehler beim Bearbeiten:", error);
      toast.error("Ein unerwarteter Fehler ist aufgetreten.");
    }
  }

  function openTaskDetails(task: Task) {
    console.log("openTaskDetails aufgerufen mit:", task);
    setSelectedTask(task);
  }
  function openEditDialog(task: Task) {
    console.log("openEditDialog aufgerufen mit:", task);
    setEditedTask(task);
  }
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

  function renderGoalsWithProgress() {
    if (goals.length === 0) return <p className="text-gray-600">Keine Ziele vorhanden.</p>;
    return (
      <div className="bg-green-100 p-4 rounded-lg shadow-md mb-10 text-black">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Ziele mit Fortschritt</h2>
        <div className="space-y-4 overflow-y-auto max-h-[400px]">
          {goals.map((goal) => (
            <div key={goal._id} className="p-3 border rounded-lg bg-white">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{goal.title}</h3>
                <button onClick={() => { setEditedGoal(goal); setIsGoalEditDialogOpen(true); }} className="text-blue-500 hover:text-blue-700">
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
  }

  async function handleTaskCreated(newTask: Task) {
    const isToday = new Date(newTask.dueDate).toDateString() === new Date(selectedDate).toDateString();
    await fetchTasks(selectedDate);
    toast.success(isToday ? "Aufgabe für heute erstellt!" : "Aufgabe gespeichert.");
  }

  async function handleDeleteInstance(taskId: string, date: string) {
    await fetch("/api/task/deleteInstance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, date }), // speichert excludedDate!
    });
    setDeleteDialogOpen(false);
    await fetchTasks(date);
  }
  function calculateDayScore(tasks: Task[], goals: GoalWithProgress[]): string {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const percent = total === 0 ? 0 : (completed / total) * 100;
    const allGoalTasksDone = tasks.filter(t => t.goalId).every(t => t.status === "completed");
    const allImportantDone = tasks.filter(t => t.points && t.points > 7).every(t => t.status === "completed");
  
    if (percent === 100) return "W+ Day";
    if (percent >= 85 && allGoalTasksDone && allImportantDone) return "W Day";
    if (percent >= 50) return "M Day";
    if (percent < 50) return "L Day";
    return "-";
  }
  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <CalendarSelector
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          showCalendar={showCalendar}
          setShowCalendar={setShowCalendar}
          tasks={tasks}
          formatDate={formatDate}
        />
        <p className="text-xl font-bold text-center text-yellow-600">
          🏅 Heute ist ein <span className="underline">{dayScore}</span>
        </p>
      </div>


      {renderGoalsWithProgress()}

      <NoTimeTaskList
        tasks={tasks}
        selectedDate={selectedDate}
        handleCheckTask={(taskId, date, checked) =>
          handleCheckTaskExternal(taskId, date, checked, fetchTasks)
        }
        openTaskDetails={openTaskDetails}
        openEditDialog={openEditDialog}
        confirmDelete={confirmDelete}
      />

      <TaskListTimeBased
        tasks={tasks}
        selectedDate={selectedDate}
        handleCheckTask={(taskId, date, checked) =>
          handleCheckTaskExternal(taskId, date, checked, fetchTasks)
        }
        openTaskDetails={openTaskDetails}
        openEditDialog={openEditDialog}
        confirmDelete={confirmDelete}
        getHeightFromDuration={getHeightFromDuration}
        getEndTime={getEndTime}
        convertToMinutes={convertToMinutes}
        checkOverlappingTasks={checkOverlappingTasks}
      />

      <TaskDetailModal
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        selectedDate={selectedDate}
        handleCheckSubTask={handleCheckSubTask}
      />

      <TaskEditModal
        editedTask={editedTask}
        setEditedTask={setEditedTask}
        handleEditTask={handleEditTask}
      />



      <GoalEditModal
        editedGoal={editedGoal}
        setEditedGoal={setEditedGoal}
        isOpen={isGoalEditDialogOpen}
        setIsOpen={setIsGoalEditDialogOpen}
        handleEditGoal={handleEditGoal}
      />



      <DeleteRecurringTaskDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleteSeries={() => taskToDelete &&
          handleDeleteSeries(taskToDelete._id, fetchTasks, selectedDate, setDeleteDialogOpen)} onDeleteInstance={function (): void {

          }} />



      <SheetWithCreateTask onTaskCreated={handleTaskCreated} />
    </div>

  );
};

export default DailyTaskList;
