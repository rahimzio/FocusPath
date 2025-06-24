"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import TradeEntryForm from "./TradeEntryForm";
import TradeListByDate from "./TradeListByDate";

export default function RecapPage() {
  const { data: session } = useSession();
  const userId = session?.user?.email || "";
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0,10));
  const [showForm, setShowForm] = useState(false);

  if (!userId) return <div>Bitte einloggen...</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border p-1" />
        <button onClick={() => setShowForm(!showForm)} className="bg-green-600 text-white px-2 py-1 rounded">
          {showForm ? "Schließen" : "Trade hinzufügen"}
        </button>
      </div>
      {showForm && <TradeEntryForm date={selectedDate} userId={userId} onCreated={() => setShowForm(false)} />}
      <TradeListByDate date={selectedDate} userId={userId} />
    </div>
  );
}