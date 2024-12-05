import React, { useState, useEffect } from "react";

const DailyTaskListHeader = () => {
  const [todayDate, setTodayDate] = useState<string>("");

  useEffect(() => {
    // Holen Sie sich das heutige Datum
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0"); // Fügt führende Nullen hinzu, wenn der Tag < 10 ist
    const month = (today.getMonth() + 1).toString().padStart(2, "0"); // Monat ist nullbasiert, daher +1
    setTodayDate(`${day}/${month}`);
  }, []);

  return (
    <div>
      <div className="flex flex-row mb-4">
        <div className="font-semibold text-lg">Heutiges Datum: {todayDate}</div>
        {/* Füge hier andere Informationen hinzu, falls nötig */}
      </div>
      {/* Weitere Inhalte */}
    </div>
  );
};

export default DailyTaskListHeader;
