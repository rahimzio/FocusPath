"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  userId: string;
  onSaved: () => void;
}

export default function AddExpenseModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  async function handleSave() {
    await fetch("/api/finance/addExpense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, category, date }),
    });
    setOpen(false);
    setAmount(0);
    setCategory("");
    setDate(new Date().toISOString().split("T")[0]);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Ausgabe eintragen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ausgabe eintragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Betrag"
          />
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Kategorie (optional)"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Button onClick={handleSave} className="w-full">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}