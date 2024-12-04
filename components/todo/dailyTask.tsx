import { useState } from "react";
import { Task } from "@/utils/interface";

const DailyTaskList = () => {
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
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{selectedTask.name}</h3>
            <p>{selectedTask.description}</p>
            <p>Punkte: {selectedTask.points}</p>
            <p>Status: {selectedTask.status}</p>
            <p>Fällig am: {selectedTask.dueDate}</p>
            <p>Uhrzeit: {selectedTask.time}</p>
            <p>Kategorie: {selectedTask.category}</p>
            <button onClick={closeModal} className="close-button">
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTaskList;
