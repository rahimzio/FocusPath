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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

interface Props {
  userId: string;
  onSaved: () => void;
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function AddSavingModal({ userId, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const [amountStr, setAmountStr] = useState("");
  const [note, setNote] = useState("");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "12,50" -> 12.5
  const parsedAmount = useMemo(() => {
    if (!amountStr.trim()) return NaN;
    const normalized = amountStr.replace(",", ".").trim();
    const num = Number(normalized);
    return Number.isFinite(num) ? num : NaN;
  }, [amountStr]);

  const isValid = useMemo(() => {
    if (!userId) return false;
    if (!MONTH_RE.test(month)) return false;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return false;
    return true;
  }, [userId, month, parsedAmount]);

  const reset = useCallback(() => {
    setAmountStr("");
    setNote("");
    setMonth(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });
    setError(null);
  }, []);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/finance/addSaving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          month,
          amount: parsedAmount,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Fehler beim Speichern der Ersparnis");
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
        <Button>Ersparnis für diesen Monat eintragen</Button>
      </DialogTrigger>

      <DialogContent onKeyDown={onKeyDown} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Ersparnis eintragen</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Schließen">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Monat</label>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Betrag</label>
            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="z. B. 250,00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notiz (optional)</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Bonus, Nebenjob, unerwartete Ersparnis"
              rows={3}
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
