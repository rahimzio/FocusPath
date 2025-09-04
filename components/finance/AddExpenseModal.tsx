// components/finance/AddExpenseModal.tsx
"use client";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_OPTIONS = [
  { value: "invest", label: "Invest" },
  { value: "funmoney", label: "Funmoney" },
  { value: "bills", label: "Bills" },
  { value: "ungeplante_rechnung", label: "Ungeplante Rechnung" },
];

// toleranter Parser: nimmt Ziffern + , . - und versucht eine Zahl daraus zu machen
function parseAmountLoose(s: string): number {
  if (!s) return NaN;
  const cleaned = s.replace(/[^\d,.\-]/g, ""); // Buchstaben raus
  if (!cleaned) return NaN;
  // Wenn beides vorkommt, vermuten wir deutsches Format ('.' als Tausendertrenner, ',' als Dezimal)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const t = cleaned.replace(/\./g, "").replace(",", ".");
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  // Nur Komma -> deutsches Dezimal
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    const n = Number(cleaned.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  // Nur Punkt oder nur Ziffern
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

export default function AddExpenseModal({
  userId,
  onSaved,
  triggerLabel = "Ausgabe eintragen",
}: {
  userId: string;
  onSaved: () => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10)); // YYYY-MM-DD (value), Anzeige je Browser-Locale
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amount = useMemo(() => parseAmountLoose(amountStr), [amountStr]);

  // Validierungen + Meldungen
  const amountError =
    amountStr.trim().length === 0 ? "Betrag wird benötigt" :
    Number.isNaN(amount) ? "Betrag muss eine Zahl sein (z. B. 12,50)" :
    amount <= 0 ? "Betrag muss > 0 sein" : null;

  const categoryError = !category ? "Kategorie wählen" : null;
  const dateError = !date ? "Datum wählen" : null;

  const isValid = !!userId && !amountError && !categoryError && !dateError;

  async function handleSave() {
    setErr(null);
    if (!isValid) {
      // zeig die erste Fehlermeldung prominent
      setErr(amountError || categoryError || dateError || "Bitte Felder prüfen.");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const body = {
        userId,
        amount,                 // bereits Zahl
        category,               // slug
        dueDate: new Date(date).toISOString(), // ISO
        note: note.trim() || undefined,
      };

      const res = await fetch("/api/finance/addExpense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "Fehler beim Speichern";
        try { msg = (await res.json()).message || msg; } catch {}
        throw new Error(msg);
      }

      onSaved?.();
      // Reset
      setOpen(false);
      setAmountStr("");
      setCategory("");
      setNote("");
      setDate(new Date().toISOString().slice(0,10));
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="secondary">{triggerLabel}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ausgabe eintragen</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm">Betrag</label>
            <Input
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="z. B. 12,50"
            />
            {amountError ? <p className="text-xs text-red-500 mt-1">{amountError}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Kategorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategorie wählen" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categoryError ? <p className="text-xs text-red-500 mt-1">{categoryError}</p> : null}
            </div>
            <div>
              <label className="text-sm">Datum</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {dateError ? <p className="text-xs text-red-500 mt-1">{dateError}</p> : null}
            </div>
          </div>

          <div>
            <label className="text-sm">Notiz (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Mittagessen" />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
