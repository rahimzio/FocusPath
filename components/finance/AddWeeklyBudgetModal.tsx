"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BudgetCategoryEntry } from "@/utils/interface";

interface Props {
  userId: string;
  week: string;
  onSaved: () => void;
}

export default function AddWeeklyBudgetModal({ userId, week, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState(0);
  const [categories, setCategories] = useState<BudgetCategoryEntry[]>([]);
  const [catName, setCatName] = useState("");
  const [catAmount, setCatAmount] = useState(0);

  function addCategory() {
    if (!catName || !catAmount) return;
    setCategories([...categories, { name: catName, amount: catAmount }]);
    setCatName("");
    setCatAmount(0);
  }

  async function handleSave() {
    const spent = categories.reduce((sum, c) => sum + c.amount, 0);
    await fetch("/api/finance/updateWeeklyBudget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, week, budget, spent, categories }),
    });
    setOpen(false);
    setBudget(0);
    setCategories([]);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md">Budget setzen</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wochenbudget setzen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input type="number" value={budget} onChange={e => setBudget(Number(e.target.value))} placeholder="Budget" />
          <div className="flex space-x-2">
            <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Kategorie" />
            <Input type="number" value={catAmount} onChange={e => setCatAmount(Number(e.target.value))} placeholder="Betrag" />
            <button onClick={addCategory} className="px-2 bg-gray-200 rounded">+</button>
          </div>
          <ul className="space-y-1 text-sm">
            {categories.map(c => (
              <li key={c.name} className="flex justify-between"><span>{c.name}</span><span>{c.amount} €</span></li>
            ))}
          </ul>
          <button onClick={handleSave} className="w-full px-4 py-2 bg-green-600 text-white rounded-md">Speichern</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
