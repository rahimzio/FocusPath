'use client';

import { useState } from 'react';
import { Task } from '@/utils/interface';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const SheetWithCreateTask = () => {
  const [task, setTask] = useState<Task>({
    id: '',
    name: '',
    description: '',
    points: 0,
    status: 'incomplete',
    dueDate: '',
    frequency: 'daily',
    category: '',
    linkedApps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await fetch('/api/task/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(task),
    });

    if (response.ok) {
      alert('Aufgabe erfolgreich erstellt!');
      setTask({
        id: '',
        name: '',
        description: '',
        points: 0,
        status: 'incomplete',
        dueDate: '',
        frequency: 'daily',
        category: '',
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      alert('Fehler beim Erstellen der Aufgabe');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="fixed bottom-4 right-4">
      <Sheet>
        <SheetTrigger className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700">
          Neue Aufgabe erstellen
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Neue Aufgabe erstellen</SheetTitle>
            <SheetDescription>
              Füllen Sie die Details aus, um eine neue Aufgabe zu erstellen.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={task.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Beschreibung
              </label>
              <textarea
                id="description"
                name="description"
                value={task.description}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                Punkte
              </label>
              <input
                type="number"
                id="points"
                name="points"
                value={task.points}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                Fälligkeitsdatum
              </label>
              <input
                type="date"
                id="dueDate"
                name="dueDate"
                value={task.dueDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                Häufigkeit
              </label>
              <select
                id="frequency"
                name="frequency"
                value={task.frequency}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Kategorie
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={task.category}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="linkedApps" className="block text-sm font-medium text-gray-700">
                Verlinkte Apps
              </label>
              <input
                type="text"
                id="linkedApps"
                name="linkedApps"
                value={task.linkedApps.join(', ')}
                onChange={(e) => {
                  const apps = e.target.value.split(',').map((app) => app.trim());
                  setTask((prev) => ({ ...prev, linkedApps: apps }));
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700"
            >
              Aufgabe Erstellen
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SheetWithCreateTask;

