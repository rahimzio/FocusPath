// pages/goal/index.tsx

import React, { useEffect, useState } from "react";
import { Task, SubTask, Goal } from "@/utils/interface";

// Du kannst diese 2 Interfaces auch aus @/utils/interface importieren,
// falls du sie dort angelegt hast:

// Dummy: Generiert IDs

const generateId = (): string => Math.random().toString(36).substring(2);


// ------------------------------------------
//            GOAL MANAGER KOMPONENTE
// ------------------------------------------
export default function GoalManager() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: "",
    description: "",
    type: "monthly", 
    startDate: "",
    endDate: "",
    progress: 0,
  });

  useEffect(() => {
    async function loadGoals() {
      try {
        const res = await fetch("/api/goals/getGoals");
        const data = await res.json();
        if (res.ok) {
          setGoals(data.goals);
        } else {
          console.error("Fehler beim Laden:", data.message);
        }
      } catch (err) {
        console.error("Netzwerkfehler:", err);
      }
    }

    loadGoals();
  }, []);
  // Modal State für Subtasks
  const [subTaskModalOpen, setSubTaskModalOpen] = useState(false);
  // aktuelle Task, für die wir Subtasks verwalten
  const [currentTaskForSubtasks, setCurrentTaskForSubtasks] = useState<Task | null>(null);

  // Im Modal: Liste neuer Subtasks (wird dynamisch befüllt)
  const [newSubTasks, setNewSubTasks] = useState<SubTask[]>([]);

  // --- Neues Ziel erstellen
  const handleCreateGoal = () => {
    if (!newGoal.title || !newGoal.type || !newGoal.startDate || !newGoal.endDate) {
      alert("Bitte Titel, Typ, Start- und Enddatum eingeben!");
      return;
    }

    const goalToAdd: Goal = {
      _id: generateId(),
      title: newGoal.title!,
      description: newGoal.description || "",
      type: newGoal.type!,
      startDate: newGoal.startDate!,
      endDate: newGoal.endDate!,
      progress: 0,
      tasks: [],
      subGoals: [],
      createdAt: "",
      updatedAt: "",
    };

    setGoals([...goals, goalToAdd]);
    setNewGoal({ ...newGoal, title: "", description: "" });
  };

  // --- Wochengoal erstellen
  const handleAddWeeklyGoal = (parentGoalId: string) => {
    const parentGoalIndex = goals.findIndex((g) => g._id === parentGoalId);
    if (parentGoalIndex === -1) return;

    const newWeekGoal: Goal = {
      _id: generateId(),
      title: "Wochenziel (4x Training)",
      description: "Automatisch generiertes Unterziel",
      type: "weekly",
      startDate: goals[parentGoalIndex].startDate,
      endDate: goals[parentGoalIndex].endDate,
      progress: 0,
      parentGoalId: parentGoalId,
      tasks: [],
      subGoals: [],
      createdAt: "",
      updatedAt: "",
    };

    const updatedGoal = { ...goals[parentGoalIndex] };
    updatedGoal.subGoals = [...(updatedGoal.subGoals || []), newWeekGoal];

    const newGoals = [...goals];
    newGoals[parentGoalIndex] = updatedGoal;
    setGoals(newGoals);
  };

  // --- 4 Daily Tasks anlegen
  const handleGenerateDailyTasksForWeekGoal = (goalId: string) => {
    const parentGoalIndex = goals.findIndex((g) => g._id === goalId);
    if (parentGoalIndex === -1) return;

    const parentGoal = goals[parentGoalIndex];

    // Sicherstellen, dass generateId immer einen string zurückgibt
    const generateId = (): string => {
        return Math.random().toString(36).substring(2);
    };

    // Erstellung der Tasks, garantiert alle Typen stimmen
    const tasks: Task[] = Array.from({ length: 4 }, (_, i) => ({
        _id: generateId(), // _id ist jetzt immer ein string
        name: `Training Tag ${i + 1}`,
        description: "",
        points: 10,
        status: "incomplete",
        dueDate: parentGoal.startDate || "",
        frequency: "daily",
        category: "Sport",
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timebased: false,
        time: "",
        progress: 0,
        duration: "",
        parentGoalId: parentGoal._id,
        subTasks: [],
    }));

    // Annahme: 'updatedGoal.tasks' muss ein Task[] sein
    const updatedGoal = {
        ...parentGoal,
        tasks: [...(parentGoal.tasks || []), ...tasks],
    };

    const newGoals = [...goals];
    newGoals[parentGoalIndex] = updatedGoal;
    setGoals(newGoals);
};




  // --- Task abschließen
  const handleCompleteTask = (goalId: string, taskId: string) => {
    // ... wie gehabt ...
    //   (1) goal finden,
    //   (2) task finden,
    //   (3) status = completed,
    //   (4) progress updaten
    //   (5) setGoals(newGoals)
    //   (6) updateParentGoalProgress(...) etc.
    // (Kürze hier ab, da du es schon implementiert hast)
    // ...
    console.log("Task complete logic goes hier... (wie gehabt)");
  };

  // --- SubTask abschließen
  const handleCompleteSubTask = (task: Task, subTaskId: string, goalId: string) => {
    // Finde den SubTask
    if (!task.subTasks) return;
    const stIndex = task.subTasks.findIndex((st) => st._id === subTaskId);
    if (stIndex === -1) return;

    const updatedSt = { ...task.subTasks[stIndex], status: "completed" as const };
    task.subTasks[stIndex] = updatedSt;

    // Berechne progress des Haupt-Tasks (ein einfacher Ansatz):
    const total = task.subTasks.length;
    const done = task.subTasks.filter((st) => st.status === "completed").length;
    // z.B. mainTaskProgress = 50% Subtasks + 50% mainTask selbst => oder nur Subtasks
    // Hier nur Subtasks:
    const subTasksProgress = Math.round((done / total) * 100);
    task.progress = subTasksProgress;

    // Jetzt "goalId" ansteuern, progress hochrechnen (optional)
    // Du kannst handleCompleteTask oder updateParentGoalProgress aufrufen,
    // wenn du willst, dass das Goal geupdatet wird.

    setGoals([...goals]);
  };

  // --- Rekursive Aggregation (wie gehabt)
  const updateParentGoalProgress = (parentGoalId: string, currentGoals: Goal[]) => {
    // ... dein Code ...
  };

  // *** SUBTASK MODAL-FUNKTIONALITÄT ***

  // Button in der UI -> "Subtasks verwalten"
  function openSubTaskModal(task: Task) {
    setCurrentTaskForSubtasks(task);
    // Falls schon subTasks existieren, wollen wir sie ggf. anzeigen oder
    // wir fangen leer an, um "zusätzlich" mehrere anlegen zu können:
    setNewSubTasks([]);
    setSubTaskModalOpen(true);
  }

  function closeSubTaskModal() {
    setSubTaskModalOpen(false);
    setCurrentTaskForSubtasks(null);
  }

  // Zeile hinzufügen
  function handleAddSubTaskRow() {
    setNewSubTasks((prev) => [
      ...prev,
      {
        _id: generateId(),
        name: "",
        points: 0,
        status: "incomplete",
      },
    ]);
  }

  // Eine Eingabe in der Subtask-Liste ändern
  function handleChangeSubTask(index: number, field: keyof SubTask, value: any) {
    setNewSubTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  // Alle Subtasks übernehmen
  function handleSaveSubTasks() {
    if (!currentTaskForSubtasks) return;
    // Hänge die neuen Subtasks an das Task-Objekt an
    const mergedSubTasks = [
      ...(currentTaskForSubtasks.subTasks || []),
      ...newSubTasks,
    ];
    currentTaskForSubtasks.subTasks = mergedSubTasks;

    // State updaten
    setGoals([...goals]);
    closeSubTaskModal();
  }

  // --- Container filtern
  const dailyGoals = goals.filter((g) => g.type === "daily");
  const weeklyGoals = goals.filter((g) => g.type === "weekly");
  const monthlyGoals = goals.filter((g) => g.type === "monthly");
  const yearlyGoals = goals.filter((g) => g.type === "yearly");

  // RENDER
  return (
    <div className="max-w-4xl mx-auto p-4 text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center">Ziel-Manager (mit Subtasks)</h1>

      {/* Neues Ziel erstellen */}
      <div className="bg-white shadow p-4 mb-8 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Neues Ziel erstellen</h2>
        {/* ... das Formular für ein neues Goal ... */}
        {/* ... handleCreateGoal, etc. wie in deinem Code ... */}
      </div>

      {/* Container für Jahresziele */}
      <GoalContainer
        title="Jahresziele"
        goals={yearlyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={openSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      {/* Monatsziele */}
      <GoalContainer
        title="Monatsziele"
        goals={monthlyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={openSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      {/* Wochenziele */}
      <GoalContainer
        title="Wochenziele"
        goals={weeklyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={openSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      {/* Tagesziele */}
      <GoalContainer
        title="Tagesziele"
        goals={dailyGoals}
        onAddWeekly={handleAddWeeklyGoal}
        onGenerateDaily={handleGenerateDailyTasksForWeekGoal}
        onCompleteTask={handleCompleteTask}
        onOpenSubTaskModal={openSubTaskModal}
        onCompleteSubTask={handleCompleteSubTask}
      />

      {/* MODAL für Subtasks */}
      {subTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-4 rounded shadow">
            <h2 className="text-lg font-bold mb-2">Subtasks verwalten</h2>

            <div className="flex flex-col space-y-2">
              {newSubTasks.map((st, idx) => (
                <div key={st._id} className="border p-2 rounded">
                  <label className="block text-sm font-medium">
                    Name
                    <input
                      type="text"
                      className="block w-full border border-gray-300 rounded p-1"
                      value={st.name}
                      onChange={(e) =>
                        handleChangeSubTask(idx, "name", e.target.value)
                      }
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Punkte
                    <input
                      type="number"
                      className="block w-full border border-gray-300 rounded p-1"
                      value={st.points || 0}
                      onChange={(e) =>
                        handleChangeSubTask(idx, "points", Number(e.target.value))
                      }
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Fälligkeitsdatum
                    <input
                      type="date"
                      className="block w-full border border-gray-300 rounded p-1"
                      value={st.dueDate || ""}
                      onChange={(e) =>
                        handleChangeSubTask(idx, "dueDate", e.target.value)
                      }
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Uhrzeit
                    <input
                      type="time"
                      className="block w-full border border-gray-300 rounded p-1"
                      value={st.time || ""}
                      onChange={(e) =>
                        handleChangeSubTask(idx, "time", e.target.value)
                      }
                    />
                  </label>

                  <label className="inline-flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={st.showInDaily || false}
                      onChange={(e) =>
                        handleChangeSubTask(idx, "showInDaily", e.target.checked)
                      }
                    />
                    <span className="ml-1 text-sm">In Daily anzeigen?</span>
                  </label>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddSubTaskRow}
              className="mt-3 bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 text-sm"
            >
              + Weitere Zeile
            </button>

            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={closeSubTaskModal}
                className="border border-gray-300 px-4 py-1 rounded"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveSubTasks}
                className="bg-blue-700 text-white px-4 py-1 rounded hover:bg-blue-800"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------
//            GOAL CONTAINER
// ------------------------------------------
type GoalContainerProps = {
  title: string;
  goals: Goal[];
  onAddWeekly: (parentGoalId: string) => void;
  onGenerateDaily: (goalId: string) => void;
  onCompleteTask: (goalId: string, taskId: string) => void;
  onOpenSubTaskModal: (task: Task) => void;
  onCompleteSubTask: (task: Task, subTaskId: string, goalId: string) => void;
};

function GoalContainer({
  title,
  goals,
  onAddWeekly,
  onGenerateDaily,
  onCompleteTask,
  onOpenSubTaskModal,
  onCompleteSubTask,
}: GoalContainerProps) {
  if (goals.length === 0) return null;

  return (
    <div className="bg-white shadow p-4 mb-6 rounded-lg text-gray-800">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {goals.length > 0 ? (
        goals.map((goal) => (
          <div
            key={goal._id}
            className="border border-gray-300 p-3 rounded mb-4"
          >
            <h3 className="font-bold text-lg mb-1 text-gray-900">
              {goal.title} <span className="text-sm font-normal">({goal.type})</span>
            </h3>
            <p className="text-sm text-gray-700 mb-1">
              Fortschritt: {goal.progress}%
            </p>
            <p className="mb-2 text-gray-800">{goal.description}</p>
            <p className="text-sm text-gray-700 mb-2">
              Zeitraum: {goal.startDate} - {goal.endDate}
            </p>
  
            {goal.type === "monthly" && (
              <button
                onClick={() => onAddWeekly(goal._id!)}
                className="inline-block bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 mr-2 mb-2"
              >
                Wochengoal erstellen
              </button>
            )}
  
            {goal.type === "weekly" && (
              <button
                onClick={() => onGenerateDaily(goal._id!)}
                className="inline-block bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 mr-2 mb-2"
              >
                4 Tagesaufgaben generieren
              </button>
            )}
  
            {/* Task-Liste */}
            {goal.tasks && goal.tasks.length > 0 && (
              <div className="ml-4 mt-3">
                <h4 className="font-semibold mb-2 text-gray-900">Aufgaben:</h4>
                {goal.tasks.map((task) => (
                  <div key={task._id} className="mb-4 border p-2 rounded bg-gray-50">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-800 flex-1">
                        <strong>{task.name}</strong> | Status: {task.status} | Fortschritt:{" "}
                        {task.progress}%
                      </span>
                      <div className="space-x-1">
                        {task.status === "incomplete" && (
                          <button
                            onClick={() => onCompleteTask(goal._id!, task._id!)}
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
  
                    {/* Subtasks auflisten */}
                    {task.subTasks && task.subTasks.length > 0 && (
                      <div className="ml-3 mt-2 space-y-1">
                        {task.subTasks.map((st) => (
                          <div
                            key={st._id}
                            className="bg-yellow-50 border-l-4 border-yellow-200 p-2 text-sm flex items-center"
                          >
                            <span className="flex-1">
                              <strong>{st.name}</strong> (Status: {st.status})
                              {st.dueDate && ` - fällig am ${st.dueDate}`}
                              {st.time && ` um ${st.time}`}
                              {st.showInDaily && ` (Daily)`}
                            </span>
                            {st.status === "incomplete" && (
                              <button
                                onClick={() => onCompleteSubTask(task, st._id!, goal._id!)}
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
            )}
  
            {/* Subgoals */}
            {goal.subGoals && goal.subGoals.length > 0 && (
              <div className="ml-4 mt-3">
                <h4 className="font-semibold mb-2 text-gray-900">Unterziele:</h4>
                {goal.subGoals.map((sg) => (
                  <div
                    key={sg._id}
                    className="border border-gray-200 p-2 rounded mb-2 text-gray-800"
                  >
                    <h5 className="font-bold text-sm text-gray-900">
                      {sg.title} ({sg.type}) - {sg.progress}%
                    </h5>
                    <p className="text-sm">{sg.description}</p>
                    {/* Falls SubGoal auch Tasks hat */}
                    {sg.tasks && sg.tasks.length > 0 && (
                      <div className="ml-3 mt-2">
                        {sg.tasks.map((t) => (
                          <div key={t._id} className="flex items-center mb-1 text-gray-800">
                            <span className="flex-1 text-sm">
                              {t.name} - {t.status} ({t.progress}%)
                            </span>
                            {/* ... Button "Erledigen" etc. ... */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <p className="text-gray-600">Keine Ziele vorhanden</p>
      )}
    </div>
  );
  
}