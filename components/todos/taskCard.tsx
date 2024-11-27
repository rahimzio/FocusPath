import { Task } from '@/utils/interface';
import React from 'react';

const TaskCard = ({ task, onDrag }: { task: Task, onDrag: Function }) => {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const newTime = e.clientY.toString(); // Umwandeln von number in string
    onDrag(task.id, newTime); // Update task's due time
  };

  return (
    <div className="task-card" draggable onDragEnd={handleDrop}>
      <h3>{task.name}</h3>
      <p>{task.description}</p>
      <p>Due Date: {task.dueDate}</p>
      <p>Status: {task.status}</p>
    </div>
  );
};

export default TaskCard;