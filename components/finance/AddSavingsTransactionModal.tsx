"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

type Account = { accountId: string; name: string; baseCurrency: string };
type Kind =
  | "cash_deposit" | "cash_withdrawal"
  | "asset_buy" | "asset_sell"
  | "asset_transfer_in" | "asset_transfer_out";

export default function AddSavingsTransactionModal({
  userId,
  onSaved,
  refreshKey = 0,
  defaultAccountId,
  defaultKind,
  triggerLabel = "Transaktion erfassen",
  defaultAsset,
  lockAsset = false,
}: {
  userId: string;
  onSaved: () => void;
  refreshKey?: number;
  defaultAccountId?: string;
  defaultKind?: Kind;
  triggerLabel?: string;
  defaultAsset?: { class: "crypto"|"stock"|"etf"|"other"; symbol: string; name?: string };
  lockAsset?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>("");
  const [kind, setKind] = useState<Kind>("cash_deposit");

  const [assetClass, setAssetClass] = useState<"crypto" | "stock" | "etf" | "other">("crypto");
  const [assetSymbol, setAssetSymbol] = useState("");
  const [assetName, setAssetName] = useState("");

  const [unitsStr, setUnitsStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [cashStr, setCashStr] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    class: "crypto"|"stock"|"etf",
    symbol: string,
    name?: string,
    provider: "coingecko"|"alphavantage",
    providerId?: string,
    market?: string
  }>>([]);

  async function runSearch() {
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const r = await fetch(`/api/finance/searchAsset?q=${encodeURIComponent(searchTerm)}&type=all`);
      if (r.ok) {
        const j = await r.json();
        setSearchResults(j.results || []);
      }
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(`/api/finance/accounts?userId=${userId}`);
        if (!res.ok) throw new Error("Konnte Accounts nicht laden");
        const data = await res.json();
        const list: Account[] = Array.isArray(data.accounts) ? data.accounts : [];
        setAccounts(list);

        if (!accountId) {
          const prefer = defaultAccountId ? list.find(a => a.accountId === defaultAccountId) : null;
          setAccountId(prefer?.accountId || list[0]?.accountId || "");
        }
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey, defaultAccountId]);

  useEffect(() => { if (defaultKind) setKind(defaultKind); }, [defaultKind]);
  useEffect(() => { if (defaultAccountId) setAccountId(defaultAccountId); }, [defaultAccountId]);
  useEffect(() => {
    if (defaultAsset) {
      setAssetClass(defaultAsset.class);
      setAssetSymbol(defaultAsset.symbol);
      setAssetName(defaultAsset.name || "");
    }
  }, [defaultAsset]);

  const needsAsset = useMemo(() => kind.startsWith("asset_"), [kind]);
  const needsUnitsPrice = useMemo(() => kind === "asset_buy" || kind === "asset_sell", [kind]);
  const needsUnitsOnly = useMemo(() => kind === "asset_transfer_in" || kind === "asset_transfer_out", [kind]);
  const needsUnits = useMemo(() => needsUnitsPrice || needsUnitsOnly, [needsUnitsPrice, needsUnitsOnly]);
  const needsCash = useMemo(() => kind.startsWith("cash_") || kind === "asset_buy" || kind === "asset_sell", [kind]);

  function toNum(s: string) {
    if (!s.trim()) return NaN;
    const n = Number(s.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  const isValid = useMemo(() => {
    if (!userId || !accountId || !kind) return false;

    if (needsAsset && !assetSymbol.trim()) return false;

    if (needsUnitsPrice) {
      const u = toNum(unitsStr), p = toNum(priceStr);
      if (!(u > 0 && p > 0)) return false;
    }
    if (needsUnitsOnly) {
      const u = toNum(unitsStr);
      if (!(u > 0)) return false;
    }
    if (needsCash && kind.startsWith("cash_")) {
      const c = toNum(cashStr);
      if (!(c > 0)) return false;
    }
    return true;
  }, [userId, accountId, kind, needsAsset, assetSymbol, needsUnitsPrice, needsUnitsOnly, unitsStr, priceStr, needsCash, cashStr]);

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true); setErr(null);
    try {
      const body: any = {
        userId,
        accountId,
        transactionKind: kind,
        date: new Date(date).toISOString(),
        note: note.trim() || undefined,
      };

      if (needsAsset) {
        body.asset = {
          class: assetClass,
          symbol: assetSymbol.trim().toUpperCase(),
          name: assetName.trim() || undefined,
        };
      }
      if (needsUnits) {
        const u = toNum(unitsStr);
        if (Number.isFinite(u)) body.units = u;
      }
      if (needsUnitsPrice) {
        const p = toNum(priceStr);
        if (Number.isFinite(p)) body.pricePerUnit = p;
      }
      if (needsCash) {
        const c = toNum(cashStr);
        if (Number.isFinite(c)) body.cashAmount = c;
      }

      const res = await fetch("/api/finance/addTransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let msg = "Fehler beim Speichern";
        try { msg = (await res.json()).message || msg; } catch { /* noop */ }
        throw new Error(msg);
      }

      onSaved();
      setOpen(false);
      setKind(defaultKind ?? "cash_deposit");
      setAssetSymbol(""); setAssetName("");
      setUnitsStr(""); setPriceStr(""); setCashStr("");
      setNote("");
    } catch (e: any) {
      setErr(e?.message ?? "Unerwarteter Fehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>{triggerLabel}</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Transaktion erfassen</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" aria-label="Schließen">
                <X className="w-5 h-5" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Account</label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="Account wählen" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.accountId} value={a.accountId}>
                      {a.name} ({a.baseCurrency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Art</label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue placeholder="Art wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_deposit">Einzahlung (Cash)</SelectItem>
                  <SelectItem value="cash_withdrawal">Auszahlung (Cash)</SelectItem>
                  <SelectItem value="asset_buy">Kauf (Asset)</SelectItem>
                  <SelectItem value="asset_sell">Verkauf (Asset)</SelectItem>
                  <SelectItem value="asset_transfer_in">Transfer IN (Asset)</SelectItem>
                  <SelectItem value="asset_transfer_out">Transfer OUT (Asset)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          { (kind.startsWith("asset_")) && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm">Asset-Klasse</label>
                <Select value={assetClass} onValueChange={(v) => setAssetClass(v as any)} disabled={lockAsset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="stock">Aktie</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="other">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm">Symbol</label>
                <Input value={assetSymbol} onChange={(e) => setAssetSymbol(e.target.value)} placeholder="z. B. BTC, AAPL" disabled={lockAsset} />
              </div>
              <div>
                <label className="text-sm">Name (optional)</label>
                <Input value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Bitcoin, Apple Inc." disabled={lockAsset} />
              </div>

              {!lockAsset && (
                <div className="col-span-3 flex gap-2 items-end">
                  <Input
                    placeholder="Suche z. B. 'Bitcoin' oder 'TTWO'"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={runSearch} disabled={searching}>
                    {searching ? "Suche…" : "Suchen"}
                  </Button>
                </div>
              )}
              {!lockAsset && searchResults.length > 0 && (
                <div className="col-span-3 border rounded p-2 max-h-48 overflow-auto text-sm">
                  {searchResults.map((r, i) => (
                    <button key={i} className="w-full text-left hover:bg-muted rounded p-2"
                      onClick={() => {
                        setAssetClass(r.class as any);
                        setAssetSymbol(r.symbol);
                        setAssetName(r.name || "");
                        setSearchResults([]);
                      }}>
                      <div className="font-medium">{r.symbol} {r.name ? `– ${r.name}` : ""}</div>
                      <div className="text-xs opacity-70">{r.provider}{r.market ? ` • ${r.market}` : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {(kind === "asset_buy" || kind === "asset_sell" || kind === "asset_transfer_in" || kind === "asset_transfer_out") && (
            <div className={`grid ${kind === "asset_buy" || kind === "asset_sell" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
              <div>
                <label className="text-sm">Units</label>
                <Input inputMode="decimal" value={unitsStr} onChange={(e) => setUnitsStr(e.target.value)} placeholder="z. B. 0,01" />
              </div>
              {(kind === "asset_buy" || kind === "asset_sell") && (
                <div>
                  <label className="text-sm">Preis/Unit</label>
                  <Input inputMode="decimal" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} placeholder="z. B. 55.000,00" />
                </div>
              )}
            </div>
          )}

          {(kind.startsWith("cash_") || kind === "asset_buy" || kind === "asset_sell") && (
            <div>
              <label className="text-sm">Cash-Betrag</label>
              <Input
                inputMode="decimal"
                value={cashStr}
                onChange={(e) => setCashStr(e.target.value)}
                placeholder={kind.startsWith("cash_") ? "z. B. 500,00" : "optional – wird aus Units×Preis berechnet"}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm">Datum</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Notiz</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Abbrechen</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!isValid || saving} className="min-w-28">
              {saving ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
