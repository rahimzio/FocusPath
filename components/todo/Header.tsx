import React, { useState, useEffect } from "react";

const DailyTaskListHeader = () => {
  // Hilfsfunktion, um das heutige Datum im Format "TT/MM" zu berechnen
  const getFormattedDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}`;
  };

  // Für Testzwecke kannst du hier z.B. "01/01" verwenden, damit der Button angezeigt wird,
  // wenn das gespeicherte Datum nicht aktuell ist.
  // const [todayDate, setTodayDate] = useState<string>("01/01");
  const [todayDate, setTodayDate] = useState<string>("");

  useEffect(() => {
    console.log("useEffect: aktueller stored todayDate:", todayDate);
    // Holen Sie sich das heutige Datum
    const currentDate = getFormattedDate();
    console.log("useEffect: berechnetes aktuelles Datum:", currentDate);
    // Falls todayDate leer oder nicht aktuell ist, aktualisieren wir den State.
    if (todayDate !== currentDate) {
      console.log("useEffect: Aktualisierung des States, da stored value nicht aktuell ist.");
      setTodayDate(currentDate);
    }
  }, []); // Effekt wird nur einmal beim Mounten der Komponente ausgeführt

  // Handler, der das Datum auf den aktuellen Tag aktualisiert
  const handleUpdateDate = () => {
    const currentDate = getFormattedDate();
    console.log("handleUpdateDate: Button geklickt. Aktualisiere Datum zu:", currentDate);
    setTodayDate(currentDate);
  };

  console.log("Render: todayDate =", todayDate, "und aktuelles Datum =", getFormattedDate());

  return (
    <div>
      <div className="flex flex-row mb-4 items-center">
        <div className="font-semibold text-lg">Heutiges Datum: {todayDate}</div>
        {/* Der Button wird nur angezeigt, wenn todayDate nicht dem aktuellen Datum entspricht */}
        {todayDate !== getFormattedDate() && (
          <button
            onClick={handleUpdateDate}
            className="ml-4 px-2 py-1 bg-blue-500 text-white rounded"
          >
            Auf heutigen Tag aktualisieren
          </button>
        )}
      </div>
      {/* Weitere Inhalte */}
    </div>
  );
};

export default DailyTaskListHeader;
