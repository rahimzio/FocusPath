"use client";

import * as React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (u: string) => fetch(u).then(r => r.json());

type Props = {
  userId: string;
  defaultAccountId?: string;
  onCreated?: () => void; // optional: SWR mutate in Account-UI
  asChild?: boolean;      // falls du eigenen Trigger-Button übergeben willst
};

export default function AddCashFlowModal({ userId, defaultAccountId, onCreated, asChild }: Props) {
  const [open, setOpen] = React.useState(false);
  const [flow, setFlow] = React.useState<"deposit"|"withdrawal">("deposit");
  const [accountId, setAccountId] = React.useState<string>(defaultAccountId || "");
  const [amount, setAmount] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(""); // optional
  const [note, setNote] = React.useState<string>("");

  React.useEffect(() => {
    if (open && defaultAccountId) setAccountId(defaultAccountId);
  }, [open, defaultAccountId]);

  const { data: accData } = useSWR<{ accounts: { _id: string; name: string }[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );

  const submit = async () => {
    const amt = Number(amount);
    if (!accountId) { alert("Bitte Account wählen."); return; }
    if (!Number.isFinite(amt) || amt <= 0) { alert("Betrag muss > 0 sein."); return; }

    const payload = { userId, accountId, flow, amount: amt, date: date || undefined, note: note || undefined };
    const r = await fetch("/api/trading/cashflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(`Fehler: ${err?.error ?? r.status}`);
      return;
    }
    onCreated?.();
    setOpen(false);
    setAmount("");
    setNote("");
    setDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={asChild}>
        <Button variant="outline">Ein-/Auszahlung</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ein-/Auszahlung erfassen</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Typ</Label>
              <Select value={flow} onValueChange={(v: any) => setFlow(v)}>
                <SelectTrigger><SelectValue placeholder="Typ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Einzahlung</SelectItem>
                  <SelectItem value="withdrawal">Auszahlung</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Account wählen" /></SelectTrigger>
                <SelectContent>
                  {(accData?.accounts ?? []).map(a => (
                    <SelectItem key={a._id} value={a._id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Betrag</Label>
              <Input type="number" inputMode="decimal" placeholder="z. B. 100000" value={amount}
                     onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Datum (optional)</Label>
              <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notiz (optional)</Label>
            <Textarea placeholder="Begründung / Referenz" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={submit}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
