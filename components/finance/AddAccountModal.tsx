"use client";
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

type AccountType = "bank" | "broker" | "exchange" | "wallet";

export default function AddAccountModal({
  userId,
  onSaved,
}: { userId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [type, setType] = useState<AccountType>("exchange");
  const [baseCurrency, setBaseCurrency] = useState("EUR");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isValid = useMemo(
    () => !!userId && name.trim().length >= 2 && !!type && !!baseCurrency,
    [userId, name, type, baseCurrency]
  );

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/finance/createAccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: name.trim(),
          provider: provider.trim() || undefined,
          type,
          baseCurrency,
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Fehler beim Anlegen");
      onSaved();
      setOpen(false);
      setName(""); setProvider(""); setType("exchange"); setBaseCurrency("EUR");
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Konto/Depot anlegen</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Neues Konto/Depot</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Schließen">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <Input
              placeholder="z. B. Binance Main / N26 / Trade Republic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Typ</label>
              <Select value={type} onValueChange={(v: AccountType) => setType(v)}>
                <SelectTrigger><SelectValue placeholder="Typ wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Währung</label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger><SelectValue placeholder="Währung" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CHF">CHF</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm">App/Provider (optional)</label>
            <Input placeholder="z. B. Binance, N26, TR" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button className="w-28" onClick={handleSave} disabled={!isValid || saving}>
              {saving ? "Speichere…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
