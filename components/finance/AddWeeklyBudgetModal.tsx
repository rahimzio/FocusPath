"use client";
import { useMemo, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BudgetCategoryEntry } from "@/utils/interface";
import { X } from "lucide-react";

interface Props {
  userId: string;
  week: string; // z.B. "2025-33"
  onSaved: () => void;
}

export default function AddWeeklyBudgetModal({ userId, week, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const [budgetStr, setBudgetStr] = useState("");
  const [categories, setCategories] = useState<BudgetCategoryEntry[]>([]);
  const [catName, setCatName] = useState("");
  const [catAmountStr, setCatAmountStr] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedBudget = useMemo(() => {
    if (!budgetStr.trim()) return NaN;
    const n = Number(budgetStr.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }, [budgetStr]);

  const plannedTotal = useMemo(
    () => categories.reduce((sum, c) => sum + (Number.isFinite(c.amount) ? c.amount : 0), 0),
    [categories]
  );

  const remaining = useMemo(() => {
    if (!Number.isFinite(parsedBudget)) return NaN;
    return parsedBudget - plannedTotal;
  }, [parsedBudget, plannedTotal]);

  const isValid = useMemo(() => {
    if (!userId || !week) return false;
    if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) return false;
    if (plannedTotal < 0) return false;
    if (plannedTotal > parsedBudget) return false;
    return true;
  }, [userId, week, parsedBudget, plannedTotal]);

  const reset = useCallback(() => {
    setBudgetStr("");
    setCategories([]);
    setCatName("");
    setCatAmountStr("");
    setError(null);
  }, []);

  function addCategory() {
    const name = catName.trim();
    const parsed = Number(catAmountStr.replace(",", "."));
    if (!name || !Number.isFinite(parsed) || parsed <= 0) return;

    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setError("Kategorie existiert bereits.");
      return;
    }
    setError(null);
    setCategories((prev) => [...prev, { name, amount: parsed }]);
    setCatName("");
    setCatAmountStr("");
  }

  function removeCategory(name: string) {
    setCategories((prev) => prev.filter((c) => c.name !== name));
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/updateWeeklyBudget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, week, budget: parsedBudget, categories }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Fehler beim Speichern des Wochenbudgets");
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
    if (e.key === "Enter" && !saving) {
      if (document.activeElement && (document.activeElement as HTMLElement).id?.startsWith("cat-")) {
        e.preventDefault();
        addCategory();
      } else if (isValid) {
        e.preventDefault();
        handleSave();
      }
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
        <Button>Budget setzen</Button>
      </DialogTrigger>

      <DialogContent onKeyDown={onKeyDown} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Wochenbudget setzen</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Schließen">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Budget</label>
            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="z. B. 400,00"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Kategorie (z. B. Lebensmittel)"
              />
              <Input
                id="cat-amount"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="Betrag (z. B. 120,00)"
                value={catAmountStr}
                onChange={(e) => setCatAmountStr(e.target.value)}
              />
              <Button type="button" onClick={addCategory} variant="secondary">
                Hinzufügen
              </Button>
            </div>

            {categories.length > 0 && (
              <ul className="space-y-1 text-sm">
                {categories.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="truncate">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCategory(c.name)}
                        aria-label={`Kategorie ${c.name} entfernen`}
                      >
                        ✕
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="text-sm">
            <div className="flex justify-between">
              <span>Geplant gesamt</span>
              <span>
                {plannedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            </div>
            <div className="flex justify-between">
              <span>Rest</span>
              <span className={Number.isFinite(remaining) && remaining < 0 ? "text-red-600" : ""}>
                {Number.isFinite(remaining)
                  ? `${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                  : "—"}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button onClick={handleSave} className="min-w-28" disabled={!isValid || saving}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
