"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BudgetCategoryEntry } from "@/utils/interface";
import { Button } from "@/components/ui/button";
import { Badge } from "../ui/badge";
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
                <Button>Budget setzen</Button>
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
                        <Button type="button" onClick={addCategory} variant="secondary" size="icon">+</Button>
                    </div>
                    <ul className="space-y-1 text-sm">
                        {categories.map(c => (
                            <li key={c.name} className="flex justify-between">
                                <span>{c.name}</span>
                                <Badge variant="secondary">{c.amount} €</Badge>
                            </li>))}
                    </ul>
                    <Button onClick={handleSave} className="w-full">Speichern</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
