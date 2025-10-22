import { Task } from "@/utils/interfaces/task";
import { useState } from "react";

const DetailedTaskView = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null); // Zustand für das ausgewählte Task
  const [modalOpen, setModalOpen] = useState(false); // Zustand für das Öffnen des Modals

  // Funktion zum Öffnen des Modals mit der ausgewählten Aufgabe
  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setModalOpen(true); // Öffne das Modal
  };

  // Funktion zum Schließen des Modals
  const closeModal = () => {
    setSelectedTask(null); // Setze die ausgewählte Aufgabe auf null
    setModalOpen(false); // Schließe das Modal
  };

  // Funktion zur Bearbeitung der Aufgabe
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (selectedTask) {
      setSelectedTask({ ...selectedTask, [e.target.name]: e.target.value });
    }
  };

  return (
    <div>
      <h2>Aufgaben für den heutigen Tag</h2>
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <div
            key={task._id}
            onClick={() => openTaskDetails(task)} // Öffne das Modal bei Klick
            className="task-card"
          >
            <h3>{task.name}</h3>
            <p>{task.description}</p>
          </div>
        ))
      ) : (
        <p>Keine Aufgaben für heute gefunden</p>
      )}

      {/* Benutzerdefiniertes Modal für die detaillierte Ansicht der Aufgabe */}
      {modalOpen && selectedTask && (
        <div className="modal-overlay text-black">
          <div className="modal-content">
            <h3>
              <input
                type="text"
                name="name"
                value={selectedTask.name}
                onChange={handleEditChange}
                className="border p-2 rounded w-full"
              />
            </h3>
            <textarea
              name="description"
              value={selectedTask.description}
              onChange={handleEditChange}
              className="border p-2 rounded w-full"
            />
            <input
              type="number"
              name="points"
              value={selectedTask.points}
              onChange={handleEditChange}
              className="border p-2 rounded w-full"
            />
            <input
              type="date"
              name="dueDate"
              value={selectedTask.dueDate}
              onChange={handleEditChange}
              className="border p-2 rounded w-full"
            />
            <input
              type="time"
              name="time"
              value={selectedTask.time ?? ""}
              onChange={handleEditChange}
              className="border p-2 rounded w-full"
            />
            <input
              type="text"
              name="category"
              value={selectedTask.category}
              onChange={handleEditChange}
              className="border p-2 rounded w-full"
            />
            <button onClick={closeModal} className="close-button">
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedTaskView;
