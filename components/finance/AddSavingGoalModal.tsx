"use client";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "../ui/button";

interface Props {
    userId: string;
    onSaved: () => void;
}

export default function AddSavingGoalModal({ userId, onSaved }: Props) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [target, setTarget] = useState(0);
    const [monthly, setMonthly] = useState(0);
    const [deadline, setDeadline] = useState("");

    async function handleSave() {
        await fetch("/api/finance/createSavingGoal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, title, targetAmount: target, currentAmount: 0, monthlyContribution: monthly || undefined, deadline }),
        });
        setOpen(false);
        setTitle("");
        setTarget(0);
        setMonthly(0);
        setDeadline("");
        onSaved();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Sparziele erstellen</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Neues Sparziel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
                    <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} placeholder="Zielbetrag" />
                    <Input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} placeholder="Monatliche Einzahlung (optional)" />
                    <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                    <Button onClick={handleSave} className="w-full">Speichern</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
