import { useState, useEffect } from 'react';
import { global } from 'styled-jsx/css';

interface Task {
  _id: string;  
  id: string;
  name: string;
  description: string;
  points: number;
  status: string;
  dueDate: string;
  frequency: string;
  category: string;
  linkedApps: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  userId: string;
  structuredKlonData: {
    dailyTasks: Task[];
    weeklyGoals: Task[];
    monthlyGoals: Task[];
    yearlyGoals: Task[];
  };
  finanzappDaten: {
    income: number;
    expenses: { category: string; amount: number }[];
    savingsGoal: {
      goal: number;
      currentSavings: number;
      dueDate: string;
    };
  };
}

function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  useEffect(() => {
    fetch('/api/task/getTask')
      .then(response => response.json())
      .then((data: UserData) => {
        console.log("API response:", data);

        switch (viewType) {
          case 'weekly':
            setTasks(data.structuredKlonData.weeklyGoals || []);
            break;
          case 'monthly':
            setTasks(data.structuredKlonData.monthlyGoals || []);
            break;
          case 'yearly':
            setTasks(data.structuredKlonData.yearlyGoals || []);
            break;
          default:
            setTasks(data.structuredKlonData.dailyTasks || []);
        }
      })
      .catch((error) => {
        console.error('Fehler beim Abrufen der Daten:', error);
        setTasks([]); // Fallback auf ein leeres Array bei einem Fehler
      });
  }, [viewType]);

  // Funktion zum Abhaken einer Aufgabe
  const handleTaskCheck = async (taskId: string, checked: boolean) => {
    console.log("taskId:", taskId);
    try {
      const response = await fetch(`/api/task/updateStatus/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: checked ? 'complete' : 'incomplete' }),
      });

      if (response.ok) {
        // Status der Aufgabe im Frontend aktualisieren
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task._id === taskId ? { ...task, status: checked ? 'complete' : 'incomplete' } : task
          )
        );
      } else {
        console.error('Fehler beim Aktualisieren des Aufgabenstatus');
      }
    } catch (error) {
      console.error('Fehler beim Senden der Anfrage:', error);
    }
  };

  return (
    <div className="task-container">
    <h1>Meine Aufgaben</h1>
  
    {/* Auswahl der Ansicht */}
    <div className="view-buttons">
      <button onClick={() => setViewType('daily')}>Tägliche Ziele</button>
      <button onClick={() => setViewType('weekly')}>Wöchentliche Ziele</button>
      <button onClick={() => setViewType('monthly')}>Monatliche Ziele</button>
      <button onClick={() => setViewType('yearly')}>Jährliche Ziele</button>
    </div>
  
    {/* Anzeige der Aufgaben */}
    <ul className="task-list">
      {tasks.length > 0 ? (
        tasks.map(task => (
          <li key={task._id} className="task-item">
            <h2 className="task-name">{task.name}</h2>
            <p className="task-description">{task.description}</p>
            <p><strong>Punkte:</strong> {task.points}</p>
            <p><strong>Status:</strong> {task.status}</p>
            <p><strong>Fällig am:</strong> {task.dueDate}</p>
            <p><strong>Kategorie:</strong> {task.category}</p>
            
            {/* Checkbox zum Abhaken */}
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={task.status === 'complete'}
                onChange={(e) => handleTaskCheck(task._id, e.target.checked)}
              />
              Abhaken
            </label>
          </li>
        ))
      ) : (
        <li className="no-tasks">Keine Aufgaben gefunden.</li>
      )}
    </ul>
  </div>)  
}

export default TaskList;
