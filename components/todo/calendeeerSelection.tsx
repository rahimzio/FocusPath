"use client";
import Calendar from "react-calendar";
import { Value } from "react-calendar/dist/esm/shared/types.js";

interface CalendarSelectorProps {
  selectedDate: string;
  showCalendar: boolean;
  onDateChange: (date: Date) => void;
  toggleCalendar: () => void;
}

export default function CalendarSelector({
  selectedDate,
  showCalendar,
  onDateChange,
  toggleCalendar,
}: CalendarSelectorProps) {
  // Formatierungsfunktion
  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-center gap-4">
        <div className="cursor-pointer font-semibold text-lg" onClick={toggleCalendar}>
          {selectedDate
            ? `Gewähltes Datum: ${new Date(selectedDate).toLocaleDateString("de-DE")}`
            : `Heutiges Datum: ${new Date().toLocaleDateString("de-DE")}`}
        </div>
      </div>
      {showCalendar && (
        <Calendar
          onChange={(dateValue: Value) => {
            if (dateValue instanceof Date) {
              onDateChange(dateValue);
            }
          }}
          value={new Date(selectedDate)}
        />
      )}
    </div>
  );
}
