// AccountManager.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AccountSummaryModal from "./AccountSummaryModal";

type Acc = {
  accountId: string;
  name: string;
  baseCurrency: string;
  archived: boolean;
  archivedAt: string | null;
};

export default function AccountsManager({
  userId,
  onChanged,
}: {
  userId: string;
  onChanged: () => void;
}) {
  const [list, setList] = useState<Acc[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/finance/accounts?userId=${userId}&includeArchived=1`
      );
      const d = r.ok ? await r.json() : { accounts: [] };
      setList(d.accounts || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [userId]);

  async function archive(id: string) {
    await fetch("/api/finance/deleteAccount", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id, purge: false }),
    });
    await load();
    onChanged();
  }
  async function restore(id: string) {
    await fetch("/api/finance/restoreAccount", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id }),
    });
    await load();
    onChanged();
  }
  async function purge(id: string) {
    if (
      !confirm(
        "Wirklich endgültig löschen? Alle Transaktionen dieses Kontos werden entfernt."
      )
    )
      return;
    await fetch("/api/finance/deleteAccount?purge=true", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountId: id }),
    });
    await load();
    onChanged();
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          Konten verwalten
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <div className="text-sm opacity-70">Lade…</div>}
        {!loading && list.length === 0 && (
          <div className="text-sm opacity-70">Keine Konten.</div>
        )}

        {list.map((a) => (
          <div
            key={a.accountId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border rounded p-2 bg-white dark:bg-zinc-900"
          >
            <div className="flex-1 min-w-0">
              <AccountSummaryModal
                userId={userId}
                accountId={a.accountId}
                trigger={
                  <button className="text-left w-full">
                    <div className="font-medium underline decoration-dotted underline-offset-4 break-words">
                      {a.name}{" "}
                      <span className="text-xs opacity-60">
                        ({a.baseCurrency})
                      </span>
                      {a.archived && (
                        <span className="ml-2 text-xs text-yellow-700">
                          archiviert
                        </span>
                      )}
                    </div>
                    {a.archivedAt && (
                      <div className="text-xs opacity-60">
                        seit{" "}
                        {new Date(a.archivedAt).toLocaleDateString("de-DE")}
                      </div>
                    )}
                  </button>
                }
              />
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
              {!a.archived && (
                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  onClick={() => archive(a.accountId)}
                >
                  Archivieren
                </Button>
              )}
              {a.archived && (
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => restore(a.accountId)}
                >
                  Wiederherstellen
                </Button>
              )}
              <Button
                className="w-full sm:w-auto"
                variant="destructive"
                onClick={() => purge(a.accountId)}
              >
                Endgültig löschen
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
