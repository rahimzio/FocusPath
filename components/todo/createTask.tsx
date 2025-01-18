"use client";

import { useState } from "react";
import { Task } from "@/utils/interface";

export default function CreateTask() {
  const [task, setTask] = useState<Task>({
    _id: "",
    id: "",
    name: "",
    description: "",
    points: 0,
    status: "incomplete",
    dueDate: "",
    frequency: "daily", // Standardmäßig 'daily'
    category: "",
    linkedApps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timebased: false,
    time: "", // Uhrzeit kann für "once" Aufgaben genutzt werden
  });

  // Funktion zum Erstellen einer neuen Aufgabe
 /* const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Sende die Aufgabe zur API
    const response = await fetch("/api/task/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });

    if (response.ok) {
      alert("Aufgabe erfolgreich erstellt!");
      setTask({
        _id: "",
        id: "",
        name: "",
        description: "",
        points: 0,
        status: "incomplete",
        dueDate: "",
        frequency: "daily",
        category: "",
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timebased: false,
        time: "",
      }); // Formular zurücksetzen
    } else {
      alert("Fehler beim Erstellen der Aufgabe");
    }
  };*/
  
  const [tasks, setTasks] = useState<Task[]>([]);  // Array von Aufgaben (Task[])

  // handleSubmit-Funktion zum Hinzufügen einer neuen Aufgabe
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const response = await fetch("/api/task/createTask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });
  
    if (response.ok) {
      alert("Aufgabe erfolgreich erstellt!");
  
      const newTask = await response.json();  // Neuen Task von der API erhalten
      setTasks((prevTasks) => [...prevTasks, newTask]);  // tasks aktualisieren
  
      // Zurücksetzen der Eingabewerte
      setTask({
        _id: "",
        id: "",
        name: "",
        description: "",
        points: 0,
        status: "incomplete",
        dueDate: "",
        frequency: "daily",
        category: "",
        linkedApps: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timebased: false,
        time: "",
      });
    } else {
      alert("Fehler beim Erstellen der Aufgabe");
    }
  };
 


 
  
  
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setTask((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div>
      <h1>Neue Aufgabe erstellen</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={task.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Beschreibung</label>
          <textarea
            id="description"
            name="description"
            value={task.description}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="points">Punkte</label>
          <input
            type="number"
            id="points"
            name="points"
            value={task.points}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="dueDate">Fälligkeitsdatum</label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={task.dueDate}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="frequency">Häufigkeit</label>
          <select
            id="frequency"
            name="frequency"
            value={task.frequency}
            onChange={handleChange}
          >
            <option value="once">Einmalig</option>{" "}
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
            {/* Neue Option für einmalige Aufgaben */}
          </select>
        </div>
        <div>
          <label htmlFor="category">Kategorie</label>
          <input
            type="text"
            id="category"
            name="category"
            value={task.category}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="linkedApps">Verlinkte Apps</label>
          <input
            type="text"
            id="linkedApps"
            name="linkedApps"
            value={task.linkedApps.join(", ")}
            onChange={(e) => {
              const apps = e.target.value.split(",").map((app) => app.trim());
              setTask((prev) => ({ ...prev, linkedApps: apps }));
            }}
          />
        </div>
        <div>
          <label htmlFor="time">Uhrzeit (optional)</label>
          <input
            type="time"
            id="time"
            name="time"
            value={task.time}
            onChange={handleChange}
            disabled={!task.timebased} // Nur aktiv, wenn Zeitbasiert ausgewählt
          />
        </div>
        <div>
          <label htmlFor="timebased">Zeitbasiert</label>
          <input
            type="checkbox"
            id="timebased"
            name="timebased"
            checked={task.timebased}
            onChange={() =>
              setTask((prev) => ({ ...prev, timebased: !prev.timebased }))
            }
          />
        </div>
        <button type="submit">Aufgabe Erstellen</button>
      </form>
    </div>
  );
}