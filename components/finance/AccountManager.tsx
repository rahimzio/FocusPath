"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountSummaryModal from "./AccountSummaryModal";

type Acc = { accountId: string; name: string; baseCurrency: string; archived: boolean; archivedAt: string | null };

export default function AccountsManager({ userId, onChanged }: { userId: string; onChanged: () => void }) {
  const [list, setList] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/finance/accounts?userId=${userId}&includeArchived=1`);
    if (r.ok) {
      const d = await r.json();
      setList(d.accounts || []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [userId]);

  async function archive(id: string) {
    await fetch("/api/finance/deleteAccount", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id, purge: false }),
    });
    await load(); onChanged();
  }
  async function restore(id: string) {
    await fetch("/api/finance/restoreAccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id }),
    });
    await load(); onChanged();
  }
  async function purge(id: string) {
    if (!confirm("Wirklich endgültig löschen? Alle Transaktionen dieses Kontos werden entfernt.")) return;
    await fetch("/api/finance/deleteAccount?purge=true", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id }),
    });
    await load(); onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Konten verwalten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div>Lade…</div>}
        {!loading && list.length === 0 && <div className="text-sm opacity-70">Keine Konten.</div>}
        {list.map(a => (
  <div key={a.accountId} className="flex items-center justify-between border rounded p-2">
    <div className="flex items-center gap-2">
      <AccountSummaryModal
        userId={userId}
        accountId={a.accountId}
        trigger={
          <button className="text-left">
            <div className="font-medium underline decoration-dotted underline-offset-4">
              {a.name} <span className="text-xs opacity-60">({a.baseCurrency})</span>
              {a.archived && <span className="ml-2 text-xs text-yellow-700">archiviert</span>}
            </div>
            {a.archivedAt && <div className="text-xs opacity-60">seit {new Date(a.archivedAt).toLocaleDateString("de-DE")}</div>}
          </button>
        }
      />
    </div>
    <div className="flex gap-2">
      {!a.archived && <Button variant="secondary" onClick={() => archive(a.accountId)}>Archivieren</Button>}
      {a.archived && <Button onClick={() => restore(a.accountId)}>Wiederherstellen</Button>}
      <Button variant="destructive" onClick={() => purge(a.accountId)}>Endgültig löschen</Button>
    </div>
  </div>
))}
      </CardContent>
    </Card>
  );
}
