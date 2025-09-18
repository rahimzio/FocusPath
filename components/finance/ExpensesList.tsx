// ExpensesList.tsx
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

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mo=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}
function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default function ExpensesList({ userId }: { userId: string }) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      amount: number;
      category: string;
      categoryLabel: string;
      dueDate: string;
      note?: string | null;
    }>
  >([]);

  const [cat, setCat] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [qDebounced, setQDebounced] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ userId, limit: "500" });
      if (cat && cat !== "all") params.set("category", cat);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) params.set("to", new Date(to).toISOString());
      if (qDebounced) params.set("q", qDebounced);
      const r = await fetch(`/api/finance/getExpenses?${params.toString()}`);
      if (!r.ok) throw new Error("Fehler beim Laden der Ausgaben");
      const j = await r.json();
      setItems(j.items || []);
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, cat, from, to, qDebounced, refreshKey]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (it.amount || 0), 0),
    [items]
  );

  function setRangeToday() {
    const d = new Date().toISOString().slice(0, 10);
    setFrom(d);
    setTo(d);
  }
  function setRangeThisWeek() {
    setFrom(startOfWeek().toISOString().slice(0, 10));
    setTo(endOfWeek().toISOString().slice(0, 10));
  }
  function setRangeThisMonth() {
    setFrom(firstOfMonth().toISOString().slice(0, 10));
    setTo(lastOfMonth().toISOString().slice(0, 10));
  }
  function resetFilters() {
    setCat("all");
    setFrom("");
    setTo("");
    setQ("");
  }

  function exportCSV() {
    const header = ["Datum", "Kategorie", "Notiz", "Betrag"];
    const rows = items.map((it) => [
      new Date(it.dueDate).toLocaleDateString("de-DE"),
      it.categoryLabel,
      (it.note || "").replace(/\r?\n/g, " ").replace(/"/g, '""'),
      it.amount.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ausgaben.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="flex flex-col gap-3">
        {/* Titel + Aktionen */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-gray-800 dark:text-gray-100">
            Ausgaben
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="w-full sm:w-auto"
            >
              CSV
            </Button>
            <AddExpenseModal
              userId={userId}
              onSaved={() => setRefreshKey((k) => k + 1)}
              triggerLabel="Ausgabe eintragen"
            />
          </div>
        </div>

        {/* Kategorien-Leiste */}
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <Button
              key={c.value}
              variant={cat === c.value ? "default" : "outline"}
              onClick={() => setCat(c.value)}
              className={cn("text-xs sm:text-sm")}
              size="sm"
            >
              {c.label}
            </Button>
          ))}
        </div>

        {/* Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-sm">von</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">bis</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Suche (Notiz)</label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="z. B. Supermarkt"
            />
          </div>
        </div>

        {/* Schnell-Range + Refresh */}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={setRangeToday}>
            Heute
          </Button>
          <Button variant="secondary" size="sm" onClick={setRangeThisWeek}>
            Diese Woche
          </Button>
          <Button variant="secondary" size="sm" onClick={setRangeThisMonth}>
            Dieser Monat
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Filter zurücksetzen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            {loading ? "Aktualisiere…" : "Refresh"}
          </Button>
        </div>

        <div className="text-sm opacity-70">
          Summe:{" "}
          {total.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}{" "}
          • Einträge: {items.length}
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
      </CardHeader>

      <CardContent className="w-full max-w-full">
        {loading ? (
          <div className="text-sm opacity-70">Lade…</div>
        ) : items.length === 0 ? (
          <div className="text-sm opacity-70">Keine Ausgaben gefunden.</div>
        ) : (
          <>
            {/* Mobile: gestapelte Kartenliste */}
            <div className="md:hidden space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="border rounded p-2 text-sm grid grid-cols-2 gap-x-2 gap-y-1 bg-white dark:bg-zinc-900"
                >
                  <div className="col-span-2 font-medium">
                    {new Date(it.dueDate).toLocaleDateString("de-DE")}
                  </div>
                  <div className="opacity-70">Kategorie</div>
                  <div className="text-right">{it.categoryLabel}</div>
                  <div className="opacity-70">Notiz</div>
                  <div className="text-right break-words">
                    {it.note?.trim() || "—"}
                  </div>
                  <div className="opacity-70">Betrag</div>
                  <div className="text-right font-semibold">
                    {it.amount.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Ab md: Tabelle */}
            <div className="hidden md:block overflow-x-auto">
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
                      <td className="py-2">
                        {new Date(it.dueDate).toLocaleDateString("de-DE")}
                      </td>
                      <td className="py-2">{it.categoryLabel}</td>
                      <td className="py-2">{it.note || "—"}</td>
                      <td className="py-2 text-right">
                        {it.amount.toLocaleString("de-DE", {
                          style: "currency",
                          currency: "EUR",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
