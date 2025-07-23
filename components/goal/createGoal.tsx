import React, { useEffect, useState } from "react";
import { CreateTaskBody, Goal } from "@/utils/interface";
import { getSession } from "next-auth/react";

interface Props {
  onGoalCreated: (goal: Goal) => void;
}

const NewGoalForm: React.FC<Props> = ({ onGoalCreated }) => {
  const [userId, setUserId] = useState<string>("");
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [tasks, setTasks] = useState<CreateTaskBody[]>([]);

  useEffect(() => {
    const fetchUserId = async () => {
      const session = await getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };
    fetchUserId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate || !userId) return;

    const newGoal = { title, description, startDate, endDate, goalType: type, tasks, userId };

    try {
      const response = await fetch('/api/goals/createGoals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });

      if (response.ok) {
        const data = await response.json();
        onGoalCreated({
          _id: data.goalId,
          userId,
          title,
          description,
          startDate,
          endDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progress: 0,
          goalType: type,
          tasks: [],
          subGoals: [],
          type,
          completedAt: "",
        });
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setType('monthly');
        setTasks([]);
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Ziels", error);
    }
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '', description: '', points: 0, dueDate: '', frequency: 'once', category: '', timebased: false, time: '', color: '', duration: '',
    }]);
  };

  const handleTaskChange = (index: number, field: keyof CreateTaskBody, value: any) => {
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="sm:max-w-[640px] sm:ml-auto sm:mr-0 h-full sm:h-auto overflow-y-auto shadow-md p-4 sm:p-6 rounded-xl w-full max-w-xl mx-auto background-colorunset color-white">
      <div className="grid gap-4">
        <div>
          <label className="text-sm font-medium text-white">Titel *</label>
          <input type="text" className="w-full border rounded p-2" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium text-white">Beschreibung</label>
          <textarea className="w-full border rounded p-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-white">Startdatum *</label>
            <input type="date" className="w-full border rounded p-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-white">Enddatum *</label>
            <input type="date" className="w-full border rounded p-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white">Typ</label>
          <select className="w-full border rounded p-2" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="once">Einmalig</option>
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2 text-white">Aufgaben hinzufügen</h3>
        {tasks.map((task, idx) => (
          <div key={idx} className="border p-3 rounded mb-3">
            <div className="grid gap-2">
              <input type="text" placeholder="Name" value={task.name} onChange={(e) => handleTaskChange(idx, 'name', e.target.value)} className="w-full border rounded p-1" />
              <input type="text" placeholder="Beschreibung" value={task.description} onChange={(e) => handleTaskChange(idx, 'description', e.target.value)} className="w-full border rounded p-1" />
              <input type="number" placeholder="Punkte" value={task.points} onChange={(e) => handleTaskChange(idx, 'points', Number(e.target.value))} className="w-full border rounded p-1" />
              <input type="text" placeholder="Kategorie" value={task.category} onChange={(e) => handleTaskChange(idx, 'category', e.target.value)} className="w-full border rounded p-1" />
              <select value={task.frequency} onChange={(e) => handleTaskChange(idx, 'frequency', e.target.value as any)} className="w-full border rounded p-1">
                <option value="once">Einmalig</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>
              {(task.frequency === "once" || task.frequency === "weekly") && (
                <input type="date" value={task.dueDate} onChange={(e) => handleTaskChange(idx, 'dueDate', e.target.value)} className="w-full border rounded p-1" />
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={task.timebased || false} onChange={(e) => handleTaskChange(idx, 'timebased', e.target.checked)} />
                <span className="text-sm">Zeitbasiert</span>
              </div>
              <input type="time" value={task.time} onChange={(e) => handleTaskChange(idx, 'time', e.target.value)} className="w-full border rounded p-1" />
              <input type="text" placeholder="Farbe" value={task.color} onChange={(e) => handleTaskChange(idx, 'color', e.target.value)} className="w-full border rounded p-1" />
              <input type="text" placeholder="Dauer (z. B. 30min)" value={task.duration} onChange={(e) => handleTaskChange(idx, 'duration', e.target.value)} className="w-full border rounded p-1" />
              <button type="button" onClick={() => handleRemoveTask(idx)} className="text-red-600 text-sm text-left">🗑 Entfernen</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={handleAddTask} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">+ Aufgabe hinzufügen</button>
      </div>

      <div className="mt-6 text-right">
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Ziel erstellen
        </button>
      </div>
    </form>
  );
};

export default NewGoalForm;
