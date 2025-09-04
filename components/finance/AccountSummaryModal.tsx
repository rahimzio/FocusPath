"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AddSavingsTransactionModal from "./AddSavingsTransactionModal";

type AssetRow = {
  asset: { class: "crypto"|"stock"|"etf"|"other"; symbol: string; name?: string };
  units: number;
  avgCost: number | null;       // lokal
  investedEUR: number | null;   // Summe Käufe
  priceEUR: number;
  valueEUR: number;
  costBasisEUR: number | null;
  pnlAbsEUR: number | null;
  pnlPct: number | null;
};

export default function AccountSummaryModal({
  userId,
  accountId,
  trigger,
}: { userId: string; accountId: string; trigger: React.ReactNode; }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<null | {
    account: { accountId: string; name: string; baseCurrency: string };
    cash: { amount: number; baseCurrency: string; amountEUR: number | null; deposits: number; withdrawals: number };
    priceAsOf: string | null;
    assets: AssetRow[];
    totals: { assetsValueEUR: number; totalEUR: number };
  }>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    const r = await fetch(`/api/finance/accountSummary?userId=${userId}&accountId=${accountId}`);
    if (!r.ok) return;
    setData(await r.json());
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, refreshKey]);

  const asOf = data?.priceAsOf ? `Stand: ${new Date(data.priceAsOf).toLocaleDateString("de-DE")}` : "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {data ? `${data.account.name} (${data.account.baseCurrency})` : "Lade…"}
          </DialogTitle>
        </DialogHeader>

        {!data && <div>Lade…</div>}
        {data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm opacity-70">{asOf}</div>
              <div className="text-right">
                <div>Cash: {data.cash.amount.toLocaleString("de-DE")} {data.cash.baseCurrency}</div>
                <div>Cash (EUR): {(data.cash.amountEUR ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
                <div className="text-xs opacity-70">Einzahlungen: {data.cash.deposits.toLocaleString("de-DE")} | Auszahlungen: {data.cash.withdrawals.toLocaleString("de-DE")}</div>
              </div>
            </div>

            {/* Quick-Aktionen auf Account-Ebene */}
            <div className="flex flex-wrap gap-2">
              <AddSavingsTransactionModal
                userId={userId}
                onSaved={() => setRefreshKey(k => k + 1)}
                refreshKey={refreshKey}
                defaultAccountId={data.account.accountId}
                defaultKind="cash_deposit"
                triggerLabel="Einzahlung"
              />
              <AddSavingsTransactionModal
                userId={userId}
                onSaved={() => setRefreshKey(k => k + 1)}
                refreshKey={refreshKey}
                defaultAccountId={data.account.accountId}
                defaultKind="cash_withdrawal"
                triggerLabel="Auszahlung"
              />
            </div>

            {/* Asset-Tabelle */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Asset</th>
                    <th className="py-2">Units</th>
                    <th className="py-2">Ø-EK (lokal)</th>
                    <th className="py-2">Investiert (EUR)</th>
                    <th className="py-2">Wert (EUR)</th>
                    <th className="py-2">Cost Basis (EUR)</th>
                    <th className="py-2 text-right">PnL</th>
                    <th className="py-2 text-right">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a, i) => {
                    const pnl = a.pnlAbsEUR ?? 0;
                    const pct = a.pnlPct != null ? (a.pnlPct * 100) : null;
                    const color = pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-gray-600";
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2">
                          {a.asset.symbol}{a.asset.name ? ` – ${a.asset.name}` : ""} <span className="text-xs opacity-60">({a.asset.class})</span>
                        </td>
                        <td className="py-2">{a.units}</td>
                        <td className="py-2">{a.avgCost != null ? a.avgCost.toLocaleString("de-DE") : "–"}</td>
                        <td className="py-2">{a.investedEUR != null ? a.investedEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "–"}</td>
                        <td className="py-2">{a.valueEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</td>
                        <td className="py-2">{a.costBasisEUR != null ? a.costBasisEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "–"}</td>
                        <td className="py-2 text-right">
                          <span className={color}>
                            {a.pnlAbsEUR != null ? a.pnlAbsEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "–"}
                            {pct != null ? ` (${pct.toFixed(2)}%)` : ""}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <AddSavingsTransactionModal
                              userId={userId}
                              onSaved={() => setRefreshKey(k => k + 1)}
                              refreshKey={refreshKey}
                              defaultAccountId={data.account.accountId}
                              defaultKind="asset_buy"
                              defaultAsset={{ class: a.asset.class, symbol: a.asset.symbol, name: a.asset.name }}
                              lockAsset
                              triggerLabel="Kaufen"
                            />
                            <AddSavingsTransactionModal
                              userId={userId}
                              onSaved={() => setRefreshKey(k => k + 1)}
                              refreshKey={refreshKey}
                              defaultAccountId={data.account.accountId}
                              defaultKind="asset_sell"
                              defaultAsset={{ class: a.asset.class, symbol: a.asset.symbol, name: a.asset.name }}
                              lockAsset
                              triggerLabel="Verkaufen"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-6">
              <div>Assets: {data.totals.assetsValueEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
              <div className="font-semibold">Total: {data.totals.totalEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
