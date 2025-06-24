"use client";
import { useState } from "react";
import { TradeEntry } from "@/utils/interface";

interface Props {
  date: string;
  userId: string;
  onCreated: () => void;
}

export default function TradeEntryForm({ date, userId, onCreated }: Props) {
  const [form, setForm] = useState<Partial<TradeEntry>>({ result: "win" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/trades/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, date, userId }),
    });
    setLoading(false);
    setForm({ result: "win" });
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 bg-white p-4 rounded shadow">
      <div>
        <label className="block text-sm">Symbol</label>
        <input name="symbol" onChange={handleChange} className="border p-1 w-full" />
      </div>
      <div>
        <label className="block text-sm">Setup</label>
        <input name="setup" onChange={handleChange} className="border p-1 w-full" />
      </div>
      <div className="flex gap-2">
        <input name="entry" type="number" placeholder="Entry" onChange={handleChange} className="border p-1 flex-1" />
        <input name="exit" type="number" placeholder="Exit" onChange={handleChange} className="border p-1 flex-1" />
        <input name="pnl" type="number" placeholder="PnL" onChange={handleChange} className="border p-1 flex-1" />
      </div>
      <button disabled={loading} className="bg-blue-600 text-white px-3 py-1 rounded">
        {loading ? "Speichern..." : "Speichern"}
      </button>
    </form>
  );
}