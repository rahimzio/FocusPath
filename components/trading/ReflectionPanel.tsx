"use client";
import { useState } from "react";
import { TradeEntry } from "@/utils/interface";

interface Props {
  trade: TradeEntry;
  onSaved: () => void;
}

export default function ReflectionPanel({ trade, onSaved }: Props) {
  const [notes, setNotes] = useState(trade.reflectionNotes || "");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    await fetch(`/api/trades/update?id=${trade._id}&userId=${trade.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflectionNotes: notes }),
    });
    setLoading(false);
    onSaved();
  };

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="border p-1 w-full"
      />
      <button
        onClick={save}
        disabled={loading}
        className="bg-blue-600 text-white px-2 py-1 rounded"
      >
        {loading ? "Speichern..." : "Speichern"}
      </button>
    </div>
  );
}