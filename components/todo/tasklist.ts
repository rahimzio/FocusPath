import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
// Define types for the task
interface Task {
  id: string;
  name: string;
  description: string;
  dueDate: string;
}

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "task-1", name: "Task 1", description: "Description 1", dueDate: "2023-12-01" },
    { id: "task-2", name: "Task 2", description: "Description 2", dueDate: "2023-12-02" },
    { id: "task-3", name: "Task 3", description: "Description 3", dueDate: "2023-12-03" },
  ]);

  const onDragEnd = (result: any) => {
    // Handle drag end logic here
    const { destination, source } = result;
    if (!destination) return;

    const items = Array.from(tasks);
    const [removed] = items.splice(source.index, 1);
    items.splice(destination.index, 0, removed);

    setTasks(items);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="droppable">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              padding: "10px",
              border: "1px solid lightgray",
              borderRadius: "5px",
              minHeight: "100px",
            }}
          >
            {tasks.map((task, index) => (
              <Draggable key={task.id} Draggable={task.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={{
                      ...provided.draggableProps.style,
                      padding: "10px",
                      marginBottom: "10px",
                      backgroundColor: "lightgray",
                      borderRadius: "5px",
                    }}
                  >
                    <h3>{task.name}</h3>
                    <p>{task.description}</p>
                    <p>Due Date: {task.dueDate}</p>
                    {provided.placeholder}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default TaskList;
