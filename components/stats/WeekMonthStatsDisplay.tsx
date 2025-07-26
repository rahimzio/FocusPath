import React, { useEffect, useState } from "react";
import { FaCalendarAlt, FaArrowLeft } from "react-icons/fa";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
dayjs.extend(isoWeek);

interface WeekRating {
  weekStart: string; // ISO-Montag, z.B. "2025-07-21"
  score: number;
  rating: string;    // z.B. "L-Week"
}

interface MonthRating {
  weeks: string[];   // Liste der ISO-Montage in diesem Monat
  rating: string;    // z.B. "L-Monat"
}

interface DayRating {
  date: string;      // "YYYY-MM-DD"
  rating: string;    // z.B. "W Day"
}

export default function WeekMonthStatsDisplay({ userId }: { userId: string }) {
  const [weekRatings, setWeekRatings] = useState<WeekRating[]>([]);
  const [monthRatings, setMonthRatings] = useState<MonthRating[]>([]);
  const [dailyRatings, setDailyRatings] = useState<DayRating[]>([]);

  const [selectedWeek, setSelectedWeek] = useState<WeekRating | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthRating | null>(null);
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Daten laden
  useEffect(() => {
    fetch(`/api/stats/weekMonthRatings?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setWeekRatings(data.weekRatings || []);
        setMonthRatings(data.recentMonthRatings || []);
      });
    fetch(`/api/stats/dailyRatings?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.dailyRatings)) {
          setDailyRatings(data.dailyRatings);
        }
      });
  }, [userId]);

  // Sortierungen
  const sortedWeeks = [...weekRatings].sort((a, b) =>
    dayjs(a.weekStart).diff(dayjs(b.weekStart))
  );
  const sortedMonths = [...monthRatings].sort((a, b) =>
    dayjs(a.weeks[0]).diff(dayjs(b.weeks[0]))
  );

  // --- Detailansicht: eine Woche ---
  if (selectedWeek) {
    const weekStart = dayjs(selectedWeek.weekStart).startOf("isoWeek");
    const days = Array.from({ length: 7 }).map((_, i) =>
      weekStart.add(i, "day").format("YYYY-MM-DD")
    );
    return (
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex items-center mb-4">
          <button
            onClick={() => setSelectedWeek(null)}
            className="mr-2 text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft /> zurück
          </button>
          <h3 className="text-lg font-medium">
            Woche ab {weekStart.format("YYYY-MM-DD")}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {days.map((date) => {
            const dr = dailyRatings.find((d) => d.date === date);
            const letter = dr?.rating.split(" ")[0] || "-";
            const weekday = dayjs(date).format("dd"); // Mo, Di, ...
            return (
              <div
                key={date}
                className="p-3 border rounded-lg shadow-sm bg-gray-50 text-center"
              >
                <p className="text-xs text-gray-500">{weekday}</p>
                <p className="font-bold text-md">{letter}</p>
                <p className="text-xs text-gray-400">{date.slice(5)}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Übersicht: Wochen ---
  const weeksToShow = showAllWeeks
    ? sortedWeeks
    : sortedWeeks.filter((w) =>
        dayjs(w.weekStart).month() === dayjs().month()
      );

  const WeeksPanel = (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">📅 Wochen-Performance</h3>
        <button
          onClick={() => setShowAllWeeks((f) => !f)}
          title={showAllWeeks ? "Nur aktuellen Monat" : "Ganzes Jahr anzeigen"}
          className="text-gray-600 hover:text-gray-900"
        >
          <FaCalendarAlt />
        </button>
      </div>
      {weeksToShow.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Wochen in diesem Zeitraum.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {weeksToShow.map((w) => (
            <div
              key={w.weekStart}
              onClick={() => setSelectedWeek(w)}
              className="cursor-pointer p-3 border rounded-lg shadow-sm bg-gray-50 text-center hover:bg-gray-100"
            >
              <p className="text-xs text-gray-500">
                KW ab {w.weekStart.slice(5)}
              </p>
              <p className="font-bold text-md">{w.rating}</p>
              <p className="text-sm text-gray-500">
                Score: {w.score.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // --- Detailansicht: ein Monat ---
  if (selectedMonth) {
    const monthStart = dayjs(selectedMonth.weeks[0]).startOf("month");
    return (
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex items-center mb-4">
          <button
            onClick={() => setSelectedMonth(null)}
            className="mr-2 text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft /> zurück
          </button>
          <h3 className="text-lg font-medium">
            {monthStart.format("MMMM YYYY")}
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {selectedMonth.weeks.map((wk) => {
            const wr = weekRatings.find((w) => w.weekStart === wk);
            const letter = wr?.rating || "-";
            const weekLabel = dayjs(wk).format("[KW] W"); // KW W
            return (
              <div
                key={wk}
                className="p-3 border rounded-lg shadow-sm bg-gray-50 text-center"
              >
                <p className="text-xs text-gray-500">{weekLabel}</p>
                <p className="font-bold text-md">{letter}</p>
                <p className="text-xs text-gray-400">{wk.slice(5)}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- Übersicht: Monate ---
  const monthsToShow = showAllMonths
    ? sortedMonths
    : sortedMonths.filter((m) =>
        dayjs(m.weeks[0]).month() === dayjs().month()
      );

  const MonthsPanel = (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">🗓️ Monatsbewertung</h3>
        <button
          onClick={() => setShowAllMonths((f) => !f)}
          title={showAllMonths ? "Nur aktuellen Monat" : "Ganzes Jahr anzeigen"}
          className="text-gray-600 hover:text-gray-900"
        >
          <FaCalendarAlt />
        </button>
      </div>
      {monthsToShow.length === 0 ? (
        <p className="text-sm text-gray-500">Keine Monate in diesem Zeitraum.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {monthsToShow.map((m) => {
            const monthName = dayjs(m.weeks[0]).format("MMMM YYYY");
            return (
              <div
                key={monthName}
                onClick={() => setSelectedMonth(m)}
                className="cursor-pointer p-3 border rounded-lg shadow-sm bg-gray-50 text-center hover:bg-gray-100"
              >
                <p className="text-xs text-gray-500">{monthName}</p>
                <p className="font-bold text-md">{m.rating}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {WeeksPanel}
      {MonthsPanel}
    </>
  );
}
