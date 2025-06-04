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
      } else {
        console.warn("⚠️ Keine Benutzer-Session vorhanden");
      }
    };
    fetchUserId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate || !userId) {
      alert('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    const newGoal = { title, description, startDate, endDate, goalType: type, tasks, userId };

    try {
      const response = await fetch('/api/goals/createGoals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Ziel erfolgreich erstellt!');

        // ✅ Neues Ziel an Parent-Komponente übergeben
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
          type: "daily",
          completedAt: ""
        });

        // Felder leeren
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setType('monthly');
        setTasks([]);
      } else {
        const errorData = await response.json();
        alert(`Fehler beim Erstellen des Ziels: ${errorData.message}`);
      }
    } catch (error) {
      alert(`Fehler beim Erstellen des Ziels: ${error}`);
    }
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '',
      description: '',
      points: 0,
      dueDate: '',
      frequency: 'once',
      category: '',
      timebased: false,
      time: '',
      color: '',
      duration: '',
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
    <form onSubmit={handleSubmit} className="bg-gray-50 shadow p-6 rounded-lg text-black font-normal">
      <h2 className="text-xl font-semibold mb-4">Neues Ziel erstellen</h2>

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">Titel *</label>
        <input id="title" type="text" className="w-full border border-gray-300 rounded p-2 bg-white text-black" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-1">Beschreibung</label>
        <textarea id="description" className="w-full border border-gray-300 rounded p-2 bg-white text-black" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="mb-4">
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-800 mb-1">Startdatum *</label>
        <input id="startDate" type="date" className="w-full border border-gray-300 rounded p-2 bg-white text-black" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </div>

      <div className="mb-4">
        <label htmlFor="endDate" className="block text-sm font-medium text-gray-800 mb-1">Enddatum *</label>
        <input id="endDate" type="date" className="w-full border border-gray-300 rounded p-2 bg-white text-black" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </div>

      <div className="mb-4">
        <label htmlFor="type" className="block text-sm font-medium text-gray-800 mb-1">Typ</label>
        <select id="type" className="w-full border border-gray-300 rounded p-2 bg-white text-black" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="once">Einmalig</option>
          <option value="daily">Täglich</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
          <option value="yearly">Jährlich</option>
        </select>
      </div>

      {/* Aufgabenbereich */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2">Aufgaben hinzufügen</h3>
        {tasks.map((task, idx) => (
          <div key={idx} className="border p-3 rounded mb-2 bg-white">
            <input type="text" placeholder="Name" value={task.name} onChange={(e) => handleTaskChange(idx, 'name', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <input type="text" placeholder="Beschreibung" value={task.description} onChange={(e) => handleTaskChange(idx, 'description', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <input type="number" placeholder="Punkte" value={task.points} onChange={(e) => handleTaskChange(idx, 'points', Number(e.target.value))} className="w-full mb-2 p-1 border text-black" />
            <input type="text" placeholder="Kategorie" value={task.category} onChange={(e) => handleTaskChange(idx, 'category', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <select value={task.frequency} onChange={(e) => handleTaskChange(idx, 'frequency', e.target.value as any)} className="w-full mb-2 p-1 border text-black">
              <option value="once">Einmalig</option>
              <option value="daily">Täglich</option>
              <option value="weekly">Wöchentlich</option>
              <option value="monthly">Monatlich</option>
              <option value="yearly">Jährlich</option>
            </select>
            {(task.frequency === "once" || task.frequency === "weekly") && (
              <input type="date" value={task.dueDate} onChange={(e) => handleTaskChange(idx, 'dueDate', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            )}
            <label className="inline-flex items-center text-sm mb-2">
              <input type="checkbox" checked={task.timebased || false} onChange={(e) => handleTaskChange(idx, 'timebased', e.target.checked)} />
              <span className="ml-2">Zeitbasiert</span>
            </label>
            <input type="time" value={task.time} onChange={(e) => handleTaskChange(idx, 'time', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <input type="text" placeholder="Farbe" value={task.color} onChange={(e) => handleTaskChange(idx, 'color', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <input type="text" placeholder="Dauer (z.B. 30min)" value={task.duration} onChange={(e) => handleTaskChange(idx, 'duration', e.target.value)} className="w-full mb-2 p-1 border text-black" />
            <button type="button" onClick={() => handleRemoveTask(idx)} className="text-red-600 text-sm">🗑 Entfernen</button>
          </div>
        ))}
        <button type="button" onClick={handleAddTask} className="bg-gray-600 text-white px-3 py-1 rounded text-sm mt-1">+ Aufgabe hinzufügen</button>
      </div>

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
        Ziel erstellen
      </button>
    </form>
  );
};

export default NewGoalForm;
