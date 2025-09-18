"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSWRConfig } from "swr";

type Props = {
  userId: string;
  accountId: string;
  currency?: string;
};

export default function AccountAdjustButton({ userId, accountId, currency }: Props) {
  const { mutate } = useSWRConfig();
  const [open, setOpen] = React.useState(false);
  const [kind, setKind] = React.useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const cur = (currency || "").toUpperCase();

  async function submit() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert("Bitte einen Betrag > 0 eingeben.");
      return;
    }
    const res = await fetch("/api/trading/account/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        accountId,
        amount: amt,
        kind,            // "deposit" | "withdrawal"
        note: note || undefined,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      alert(`Konnte ${kind === "deposit" ? "Einzahlung" : "Auszahlung"} nicht speichern:\n${t}`);
      return;
    }

    // Revalidate alle Account-Queries
    const prefix = `/api/trading/getAllAccounts?userId=${userId}`;
    await Promise.all([
      mutate((key) => typeof key === "string" && key.startsWith(prefix)),
      mutate(prefix),
    ]);

    setAmount("");
    setNote("");
    setOpen(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Ein-/Auszahlung
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ein-/Auszahlung buchen</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1">
              <Label htmlFor="kind">Art</Label>
              <select
                id="kind"
                className="border rounded px-2 py-2"
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
              >
                <option value="deposit">Einzahlung</option>
                <option value="withdrawal">Auszahlung</option>
              </select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="amount">Betrag {cur ? `(${cur})` : ""}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="z. B. 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid gap-1">
              <Label htmlFor="note">Notiz (optional)</Label>
              <Textarea
                id="note"
                rows={3}
                placeholder="z. B. Kapitalerhöhung, private Entnahme…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button onClick={submit}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}