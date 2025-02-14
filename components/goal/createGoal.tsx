import React, { useState } from "react";

const NewGoalForm: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDate || !endDate) {
      alert('Bitte alle Pflichtfelder ausfüllen.');
      return;
    }

    const newGoal = { title, description, startDate, endDate, type };

    try {
      const response = await fetch('/api/goals/createGoals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });

      if (response.ok) {
        alert('Ziel erfolgreich erstellt!');
        // Form zurücksetzen
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setType('monthly');
      } else {
        const errorData = await response.json();
        alert(`Fehler beim Erstellen des Ziels: ${errorData.message}`);
      }
    } catch (error) {
      alert(`Fehler beim Erstellen des Ziels: ${error}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Neues Ziel erstellen</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="title">Titel *</label>
        <input
          id="title"
          type="text"
          className="w-full border rounded p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="description">Beschreibung</label>
        <textarea
          id="description"
          className="w-full border rounded p-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="startDate">Startdatum *</label>
        <input
          id="startDate"
          type="date"
          className="w-full border rounded p-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="endDate">Enddatum *</label>
        <input
          id="endDate"
          type="date"
          className="w-full border rounded p-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1" htmlFor="type">Typ</label>
        <select
          id="type"
          className="w-full border rounded p-2"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="daily">Täglich</option>
          <option value="weekly">Wöchentlich</option>
          <option value="monthly">Monatlich</option>
          <option value="yearly">Jährlich</option>
        </select>
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Ziel erstellen
      </button>
    </form>
  );
};

export default NewGoalForm;
