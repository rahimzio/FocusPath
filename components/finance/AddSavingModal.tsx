"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  onSaved: () => void;
}

export default function AddSavingModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function handleSave() {
    await fetch("/api/finance/addSaving", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, month, amount, note }),
    });
    setOpen(false);
    setAmount(0);
    setNote("");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md">
          Ersparnis für diesen Monat eintragen
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ersparnis eintragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full border p-2 rounded"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full border p-2 rounded"
            placeholder="Betrag"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border p-2 rounded"
            placeholder="Notiz"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-green-600 text-white rounded-md w-full"
          >
            Speichern
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}