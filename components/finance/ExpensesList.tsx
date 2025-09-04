"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import AddExpenseModal from "./AddExpenseModal";

const CATS = [
  { value: "all", label: "Alle" },
  { value: "invest", label: "Invest" },
  { value: "funmoney", label: "Funmoney" },
  { value: "bills", label: "Bills" },
  { value: "ungeplante_rechnung", label: "Ungeplante Rechnung" },
];

export default function ExpensesList({ userId }: { userId: string }) {
  const [items, setItems] = useState<Array<{
    id: string;
    amount: number;
    category: string;
    categoryLabel: string;
    dueDate: string;
    note?: string | null;
  }>>([]);

  const [cat, setCat] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ userId, limit: "500" });
      if (cat && cat !== "all") params.set("category", cat);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/finance/getExpenses?${params.toString()}`);
      if (r.ok) {
        const j = await r.json();
        setItems(j.items || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [userId, cat, from, to, q, refreshKey]);

  const total = useMemo(() => items.reduce((s, it) => s + (it.amount || 0), 0), [items]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <CardTitle>Ausgaben</CardTitle>
          <AddExpenseModal
            userId={userId}
            onSaved={() => setRefreshKey(k => k + 1)}
            triggerLabel="Ausgabe eintragen"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATS.map(c => (
            <Button key={c.value}
              variant={cat === c.value ? "default" : "outline"}
              onClick={() => setCat(c.value)}
              className={cn("text-sm")}
            >
              {c.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-sm">von</label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">bis</label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Suche (Notiz)</label>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="z. B. Supermarkt" />
          </div>
        </div>

        <div className="text-sm opacity-70">
          Summe: {total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })} • Einträge: {items.length}
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {loading ? (
          <div>Lade…</div>
        ) : items.length === 0 ? (
          <div className="text-sm opacity-70">Keine Ausgaben gefunden.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Datum</th>
                <th className="py-2">Kategorie</th>
                <th className="py-2">Notiz</th>
                <th className="py-2 text-right">Betrag</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="py-2">{new Date(it.dueDate).toLocaleDateString("de-DE")}</td>
                  <td className="py-2">{it.categoryLabel}</td>
                  <td className="py-2">{it.note || "—"}</td>
                  <td className="py-2 text-right">
                    {it.amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
