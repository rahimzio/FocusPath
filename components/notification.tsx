// Notifications.tsx

import { useEffect } from 'react';

const Notifications = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      // Hole alle fälligen Aufgaben und zeige eine Benachrichtigung an
      fetch('/api/tasks?status=incomplete&dueDate=today')
        .then((res) => res.json())
        .then((data) => {
          data.forEach((task: { name: any; }) => {
            alert(`Erinnerung: Deine Aufgabe "${task.name}" ist fällig!`);
          });
        });
    }, 60000); // Alle 60 Sekunden überprüfen

    return () => clearInterval(interval); // Aufräumen
  }, []);

  return <div>Benachrichtigungen aktiviert.</div>;
};

export default Notifications;
