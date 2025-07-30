"use client";
import { useState } from "react";
import TradeEntryForm from "@/components/trading/TradeEntryForm";
import { PlusCircle } from "lucide-react";

interface Props {
  userId: string;
  date: string;
}

export default function TradeEntryFAB({ userId, date }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-500">
        <PlusCircle />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end">
          <div className="bg-white w-96 h-full p-4 overflow-y-auto">
            <button className="mb-2" onClick={() => setOpen(false)}>Schließen</button>
            <TradeEntryForm userId={userId} date={date} onCreated={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}