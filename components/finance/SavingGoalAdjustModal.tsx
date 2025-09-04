"use client";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function parseAmount(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[^\d,.\-]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) return Number(cleaned.replace(/\./g, "").replace(",", "."));
  if (cleaned.includes(",")) return Number(cleaned.replace(",", "."));
  return Number(cleaned);
}

export default function SavingGoalAdjustModal({
  userId,
  goalId,
  goalTitle,
  onChanged,
  triggerLabel = "Einzahlen / Abheben",
  variant = "secondary",
}: {
  userId: string;
  goalId: string;
  goalTitle?: string;
  onChanged: () => void;
  triggerLabel?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amount = useMemo(() => parseAmount(amountStr), [amountStr]);
  const amountErr =
    !amountStr.trim() ? "Betrag wird benötigt" :
    Number.isNaN(amount) ? "Betrag muss eine Zahl sein" :
    amount <= 0 ? "Betrag muss > 0 sein" : null;

  async function handleSave() {
    if (amountErr) { setErr(amountErr); return; }
    setSaving(true); setErr(null);
    try {
      const payload = {
        userId,
        goalId,
        delta: mode === "deposit" ? amount : -amount,
        date: new Date(date).toISOString(),
        note: note.trim() || undefined,
      };
      const r = await fetch("/api/finance/updateSavingGoal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        let m = "Fehler beim Aktualisieren";
        try { m = (await r.json()).message || m; } catch {}
        throw new Error(m);
      }
      onChanged?.();
      setOpen(false);
      setAmountStr(""); setNote(""); setMode("deposit");
    } catch (e: any) {
      setErr(e?.message || "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sparziel anpassen{goalTitle ? ` – ${goalTitle}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Aktion</label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Einzahlen</SelectItem>
                  <SelectItem value="withdraw">Abheben</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Datum</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm">Betrag</label>
            <Input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="z. B. 50,00" />
            {amountErr ? <p className="text-xs text-red-500 mt-1">{amountErr}</p> : null}
          </div>

          <div>
            <label className="text-sm">Notiz (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <Button className="w-full" onClick={handleSave} disabled={!!amountErr || saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
