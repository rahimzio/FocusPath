import React from "react";
import Calendar, { CalendarProps } from "react-calendar";
import { Task } from "@/utils/interface";

type Props = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  showCalendar: boolean;
  setShowCalendar: (show: boolean) => void;
  tasks: Task[];
  formatDate: (date: Date) => string;
};

export default function CalendarSelector({
  selectedDate,
  setSelectedDate,
  showCalendar,
  setShowCalendar,
  tasks,
  formatDate,
}: Props) {
  const handleDateChange: CalendarProps["onChange"] = (value) => {
    if (value instanceof Date) {
      const formattedDate = formatDate(value);
      console.log(`Datum geändert auf: ${formattedDate}`);
      setSelectedDate(formattedDate);
      setShowCalendar(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center gap-4">
        <div
          className="cursor-pointer font-semibold text-lg"
          onClick={() => setShowCalendar(!showCalendar)}
        >
          {selectedDate
            ? `Gewähltes Datum: ${new Date(selectedDate).toLocaleDateString("de-DE")}`
            : `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}`}
        </div>
        {selectedDate !== formatDate(new Date()) && (
          <button
            onClick={() => setSelectedDate(formatDate(new Date()))}
            className="ml-4 px-2 py-1 bg-green-500 text-white rounded"
          >
            Heute auswählen
          </button>
        )}
      </div>

      {showCalendar && (
        <Calendar
          onChange={handleDateChange}
          value={new Date(selectedDate)}
          tileClassName={({ date, view }) => {
            if (view === "month") {
              const formattedDate = formatDate(date);
              const hasTasks = tasks.some((task) => task.dueDate === formattedDate);
              return hasTasks ? "bg-blue-200 rounded-full" : "";
            }
            return "";
          }}
        />
      )}
    </div>
  );
}
