// pages/todos/overview.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import SheetWithCreateTask from './popUpCreateTask';

interface Goal {
  title: string;
  description: string;
  frequency: string; // 'weekly', 'monthly', 'yearly'
}

const TodoOverview = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentTimeframe, setCurrentTimeframe] = useState<string>('weekly');
  const router = useRouter();

  // Lade Ziele basierend auf dem Zeitrahmen
  useEffect(() => {
    fetch(`/api/goals/getGoals?timeframe=${currentTimeframe}`)
      .then((res) => res.json())
      .then((data) => setGoals(data.goals))
      .catch((error) => console.error('Error fetching goals:', error));
  }, [currentTimeframe]);

  // Zeitrahmen wechseln (Woche, Monat, Jahr)
  const handleTimeframeChange = (timeframe: string) => {
    setCurrentTimeframe(timeframe);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">To-Do Overview</h1>

      {/* Buttons zum Wechseln zwischen den Zeitrahmen */}
      <div className="mb-4">
        <Button onClick={() => handleTimeframeChange('weekly')}>Weekly Goals</Button>
        <Button onClick={() => handleTimeframeChange('monthly')}>Monthly Goals</Button>
        <Button onClick={() => handleTimeframeChange('yearly')}>Yearly Goals</Button>
      </div>

      {/* Ziele anzeigen */}
      <div>
        {goals.length === 0 ? (
          <div>No goals for this timeframe.</div>
        ) : (
          goals.map((goal, index) => (
            <Card key={index} className="mb-4 p-4">
              <h3 className="text-xl font-semibold">{goal.title}</h3>
              <p>{goal.description}</p>
              <p><strong>Frequency:</strong> {goal.frequency}</p>
            </Card>
          ))
        )}
      </div>

      {/* Button zum Öffnen der Komponente zur Ziel-Erstellung */}
      <SheetWithCreateTask />

    </div>
  );
};

export default TodoOverview;
