"use client";

import { useState, useEffect } from "react";
import { Task, GoalWithProgress, SubTask } from "@/utils/interface";
import SheetWithCreateTask from "./todo/popUpCreateTask";
import { useDailyRatingAutoSave } from "@/hooks/useDailyRatingAutoSave";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Calendar from "react-calendar";
import { Value } from "react-calendar/dist/esm/shared/types.js";
import { FaCalendarAlt, FaCheckCircle, FaEdit } from "react-icons/fa";
import { toast } from "react-toastify";
import ProgressBar from "./todo/ProgressBar";
import DeleteRecurringTaskDialog from "./todo/DeleteRecurringTask";
import CalendarSelector from "./todo/dailytodo/CalenderSelector";
import NoTimeTaskList from "./todo/dailytodo/NoTimeTaskList";
import { checkOverlappingTasks, convertToMinutes, deleteEntireSeries, getEndTime, getHeightFromDuration, handleCheckTask as handleCheckTaskExternal } from "@/utils/todo/taskUtils";
import TaskListTimeBased from "./todo/dailytodo/TimeTaskOrder";
import TaskDetailModal from "./todo/dailytodo/TaskDetail";
import TaskEditModal from "./todo/dailytodo/TaskEdit";
import GoalEditModal from "./todo/dailytodo/GoalEdit";
import useTaskDeletion, { handleDeleteSeries, confirmDeleteWithSeries, deleteSingleInstance } from "@/utils/todo/TaskDeletion";
import { handleCheckSubTask as handleCheckSubTaskExternal, useSubtaskCompletion } from "@/utils/todo/taskStatus";
import { getSession } from "next-auth/react";
function getWeekString(date: Date) {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const pastDays = Math.floor((+date - +firstDay) / 86400000);
  const week = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
  return `${date.getFullYear()}-${String(week).padStart(2, "0")}`;
}
function formatDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}


const DailyTaskList = () => {
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [editedGoal, setEditedGoal] = useState<GoalWithProgress | null>(null);
  const [isGoalEditDialogOpen, setIsGoalEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [dayScore, setDayScore] = useState<string>("-");
 const [budgetInfo, setBudgetInfo] = useState<string>("");
 const [showNoTimeOnMobile, setShowNoTimeOnMobile] = useState(false);
  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.id) setUserId(session.user.id);
      else toast.error("Fehlende Benutzer-Session.");
    });
  }, []);

  async function fetchTasks(dateParam?: string) {
    const dateToUse = dateParam || formatDate(new Date());
    if (!userId) return;
    try { 
      console.log("📥 fetchTasks", { dateToUse, userId });
      const response = await fetch(`/api/task/getTasks?date=${dateToUse}&userId=${userId}`);
      const data = await response.json();
      const allTasks = [...data.groupedTasks.goalTasks, ...data.groupedTasks.otherTasks];
      setTasks(allTasks);
      setDayScore(calculateDayScore(allTasks, goals));
    } catch (error) {
      toast.error("Fehler beim Laden der Aufgaben.");
    }
  }
  async function fetchBudget() {
    if (!userId) return;
    const week = getWeekString(new Date());
    try {
      const res = await fetch(`/api/finance/getWeeklyBudget?userId=${userId}&week=${week}`);
      const data = await res.json();
      if (data.budget) {
        const left = data.budget.budget - data.budget.spent;
        setBudgetInfo(`\u2705 Du hast noch ${left} \u20ac für diese Woche übrig`);
      }
    } catch (e) {
      console.error(e);
    }
  }
  const { handleCheckSubTask } = useSubtaskCompletion({ selectedTask, setSelectedTask, fetchTasks, userId });
  const { handleDeleteTask, confirmDelete } = useTaskDeletion({ selectedDate, fetchTasks, setDeleteDialogOpen, setTaskToDelete });
  useDailyRatingAutoSave({ userId, tasks, goals });

  useEffect(() => {
    if (userId) {
      fetchTasks(selectedDate);
      fetchBudget();
    }
  }, [selectedDate, userId]);

  function openTaskDetails(task: Task) { setSelectedTask(task); }
  function openEditDialog(task: Task) { setEditedTask(task); }

  async function handleEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editedTask) return;
    await fetch(`/api/task/updateTask?taskId=${editedTask._id}&userId=${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editedTask),
    });
    setEditedTask(null);
    setSelectedTask(null);
    await fetchTasks(selectedDate);
    toast.success("Aufgabe aktualisiert.");
  }

  async function handleEditGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!editedGoal) return;
    await fetch(`/api/goal/updateGoal?goalId=${editedGoal._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editedGoal.title, description: editedGoal.description }),
    });
    setEditedGoal(null);
    setIsGoalEditDialogOpen(false);
    toast.success("Ziel aktualisiert.");
  }

  function renderGoalsWithProgress() {
    if (!goals.length) return null;
    return (
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-semibold text-[#1c1c1e] mb-3">🎯 Deine Ziele</h2>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {goals.map((goal) => (
            <div key={goal._id} className="p-3 rounded-lg border border-[#e5e5ea]">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-[#1c1c1e]">{goal.title}</h3>
                <button onClick={() => { setEditedGoal(goal); setIsGoalEditDialogOpen(true); }} className="text-[#007AFF] hover:underline text-sm">
                  <FaEdit />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
              <ProgressBar progress={goal.progress} />
              <p className="text-xs text-gray-600 mt-1">
                {goal.completedTasks} von {goal.totalTasks} abgeschlossen ({goal.progress}%)
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
      body: JSON.stringify({ taskId, date }),
    });
    setDeleteDialogOpen(false);
    await fetchTasks(date);
  }

  function calculateDayScore(tasks: Task[], goals: GoalWithProgress[]): string {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const percent = tasks.length ? (completed / tasks.length) * 100 : 0;
    const allGoalTasksDone = tasks.filter(t => t.goalId).every(t => t.status === "completed");
    const allImportantDone = tasks.filter(t => t.points && t.points > 7).every(t => t.status === "completed");
    if (percent === 100) return "W+ Day";
    if (percent >= 85 && allGoalTasksDone && allImportantDone) return "W Day";
    if (percent >= 50) return "M Day";
    return "L Day";
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 md:px-8 pt-4 pb-8 overflow-x-hidden">
      <div className="flex items-center justify-between bg-white border border-[#e5e5ea] rounded-xl px-4 py-3 shadow hover:shadow-md cursor-pointer transition" onClick={() => setShowCalendar(!showCalendar)}>
        <div className="flex items-center gap-2 text-sm font-medium text-[#1c1c1e]">
          <FaCalendarAlt className="text-[#007AFF]" />
          {selectedDate ? new Date(selectedDate).toLocaleDateString("de-DE") : "Heute"}
        </div>
        {selectedDate !== formatDate(new Date()) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDate(formatDate(new Date()));
            }}
            className="text-xs bg-[#34C759] text-white px-3 py-1 rounded hover:brightness-110"
          >
            Heute
          </button>
        )}
      </div>

      {showCalendar && (
        <div className="bg-white p-3 rounded-xl shadow">
          <Calendar
            onChange={(value) => {
              if (value instanceof Date) {
                const formattedDate = formatDate(value);
                setSelectedDate(formattedDate);
                setShowCalendar(false);
              }
            }}
            value={new Date(selectedDate)}
            tileClassName={({ date, view }) => {
              if (view === "month") {
                const formattedDate = formatDate(date);
                const hasTasks = tasks.some((task) => task.dueDate === formattedDate);
                return hasTasks ? "bg-blue-100 text-black rounded-full" : undefined;
              }
              return undefined;
            }}
          />
        </div>
      )}
 {budgetInfo && (
        <p className="text-center text-sm text-green-700 font-medium">
          {budgetInfo}
        </p>
      )}

      <p className="text-center text-sm text-[#20253b] font-medium rounded-xl shadow border-[#e5e5ea] font-wweight-600 py-2">
         Bisheriges Tages Rating <span className="underline">{dayScore}</span>
      </p>

      {renderGoalsWithProgress()}

<button
        onClick={() => setShowNoTimeOnMobile(!showNoTimeOnMobile)}
        className="block sm:hidden w-full py-2 rounded-lg bg-blue-500 text-white mb-4"
      >
        {showNoTimeOnMobile ? "Aufgaben ausblenden" : "Aufgaben ohne Uhrzeit anzeigen"}
      </button>

      {showNoTimeOnMobile && (
        <div className="block sm:hidden">
          <NoTimeTaskList
            tasks={tasks}
            selectedDate={selectedDate}
            handleCheckTask={(taskId, date, checked) =>
              handleCheckTaskExternal(userId, taskId, date, checked, fetchTasks)
            }
            openTaskDetails={openTaskDetails}
            openEditDialog={openEditDialog}
            confirmDelete={confirmDelete}
          />
        </div>
      )}
      <div className="hidden sm:block">
        <NoTimeTaskList
          tasks={tasks}
          selectedDate={selectedDate}
          handleCheckTask={(taskId, date, checked) =>
            handleCheckTaskExternal(userId, taskId, date, checked, fetchTasks)
          }
          openTaskDetails={openTaskDetails}
          openEditDialog={openEditDialog}
          confirmDelete={confirmDelete}
        />
      </div>



      <TaskDetailModal
        userId={userId}
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        selectedDate={selectedDate}
        handleCheckSubTask={handleCheckSubTask}
      />
      <TaskListTimeBased
        UserId={userId}
        tasks={tasks}
        selectedDate={selectedDate}
        handleCheckTask={(taskId, date, checked) =>
          handleCheckTaskExternal(userId, taskId, date, checked, fetchTasks)
        }
        openTaskDetails={openTaskDetails}
        openEditDialog={openEditDialog}
        confirmDelete={confirmDelete}
        getHeightFromDuration={getHeightFromDuration}
        getEndTime={getEndTime}
        fetchTasks={fetchTasks}
        convertToMinutes={convertToMinutes}
        checkOverlappingTasks={checkOverlappingTasks}
      />
      <TaskEditModal
        userId={userId}
        editedTask={editedTask}
        setEditedTask={setEditedTask}
        handleEditTask={handleEditTask}
      />

      <GoalEditModal
        userId={userId}
        editedGoal={editedGoal}
        setEditedGoal={setEditedGoal}
        isOpen={isGoalEditDialogOpen}
        setIsOpen={setIsGoalEditDialogOpen}
        handleEditGoal={handleEditGoal}
      />

      <DeleteRecurringTaskDialog
        userId={userId}
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onDeleteSeries={() => {
          if (taskToDelete) handleDeleteSeries(userId, taskToDelete._id, fetchTasks, selectedDate, setDeleteDialogOpen);
        }}
        onDeleteInstance={() => {
          if (taskToDelete) {
            deleteSingleInstance(userId, taskToDelete._id, selectedDate);
            setDeleteDialogOpen(false);
            fetchTasks(selectedDate);
          }
        }}
      />

      {userId && <SheetWithCreateTask userId={userId} onTaskCreated={handleTaskCreated} />}
    </div>
  );
};

export default DailyTaskList;
