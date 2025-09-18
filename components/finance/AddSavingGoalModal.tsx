"use client";
import { useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Props {
  userId: string;
  onSaved: () => void;
}

export default function AddSavingGoalModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [targetStr, setTargetStr] = useState("");
  const [monthlyStr, setMonthlyStr] = useState("");
  const [deadline, setDeadline] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "12,50" -> 12.5
  const parsedTarget = useMemo(() => {
    const t = targetStr.trim();
    if (!t) return NaN;
    const num = Number(t.replace(",", "."));
    return Number.isFinite(num) ? num : NaN;
  }, [targetStr]);

  const parsedMonthly = useMemo(() => {
    const m = monthlyStr.trim();
    if (!m) return null; // optional
    const num = Number(m.replace(",", "."));
    return Number.isFinite(num) ? num : null;
  }, [monthlyStr]);

  const isValid = useMemo(() => {
    if (!userId) return false;
    if (title.trim().length < 2) return false;
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return false;
    return true;
  }, [userId, title, parsedTarget]);

  const reset = useCallback(() => {
    setTitle("");
    setTargetStr("");
    setMonthlyStr("");
    setDeadline("");
    setError(null);
  }, []);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/createSavingGoal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          targetAmount: parsedTarget,
          currentAmount: 0,
          monthlyContribution: parsedMonthly ?? undefined, // optional
          deadline: deadline || undefined, // optional
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Fehler beim Anlegen des Sparziels");
      }
      onSaved();
      reset();
      setOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && isValid && !saving) {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>Sparziel erstellen</Button>
      </DialogTrigger>

      <DialogContent onKeyDown={onKeyDown} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Neues Sparziel</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Schließen">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Titel</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Notgroschen, Urlaub, Auto"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Zielbetrag</label>
            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="z. B. 3.000,00"
              value={targetStr}
              onChange={(e) => setTargetStr(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Monatliche Einzahlung (optional)
            </label>
            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="z. B. 250,00"
              value={monthlyStr}
              onChange={(e) => setMonthlyStr(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Deadline (optional)</label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!isValid || saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
