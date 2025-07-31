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

export default function AddIncomeModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function handleSave() {
    await fetch("/api/finance/addIncome", {
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
 <Button>Einkommen eintragen</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Einkommen eintragen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Betrag"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notiz"
          />
          <Button onClick={handleSave} className="w-full">
            Speichern
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}