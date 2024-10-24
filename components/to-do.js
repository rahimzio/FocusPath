import { useState, useEffect } from 'react';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  
  useEffect(() => {
    fetch('/api/tasks/kunde1')
      .then(response => response.json())
      .then(data => setTasks(data));
  }, []);

  return (
    <div>
      <h1>Meine Aufgaben</h1>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <h2>{task.name}</h2>
            <p>{task.description}</p>
            <p>Punkte: {task.points}</p>
            <p>Status: {task.status}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
