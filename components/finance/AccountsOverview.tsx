"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddSavingsTransactionModal from "./AddSavingsTransactionModal";

type HoldingAsset = {
  accountId: string;
  asset: { class: "crypto"|"stock"|"etf"|"other"; symbol: string; name?: string };
  units: number;
  avgCost: number | null;     // in Account-Währung
  priceEUR: number | null;    // kann null sein, wenn Preis fehlt
  valueEUR: number | null;    // kann null sein
  costBasisEUR: number | null;
  pnlAbsEUR: number | null;
  pnlPct: number | null;
};

type Totals = {
  accountId: string;
  name: string;
  baseCurrency: string;
  cash: number;
  cashEUR: number | null;
  assetsValueEUR: number;
  totalEUR: number;
};

export default function AccountsOverview({ userId }: { userId: string }) {
  const [data, setData] = useState<{
    accounts: { accountId: string; name: string; baseCurrency: string }[];
    cashByAccount: { accountId: string; cash: number; currency: string; cashEUR: number | null }[];
    assetsByAccount: HoldingAsset[];
    totalsByAccount: Totals[];
    netWorthEUR: number;
    priceAsOf: string | null;
    valuationIncomplete?: boolean;
    missingPrices?: string[];
  } | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  async function load() {
    const r = await fetch(`/api/finance/holdings?userId=${userId}`);
    if (!r.ok) return;
    setData(await r.json());
  }
  useEffect(() => { load(); }, [userId, refreshKey]);

  const asOf = data?.priceAsOf ? `Stand: ${new Date(data.priceAsOf).toLocaleDateString("de-DE")}` : "";

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <CardTitle>Konten & Vermögen</CardTitle>
          <div className="text-sm opacity-70">{asOf}</div>
        </div>
        <div className="text-2xl font-semibold">
          Gesamtvermögen: { (data?.netWorthEUR ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" }) }
        </div>
        {data?.valuationIncomplete ? (
          <div className="text-sm mt-1 rounded bg-yellow-100 text-yellow-900 px-2 py-1">
            Achtung: Für einige Assets fehlen Preise. Net Worth ist ggf. unterschätzt.
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        {!data && <div>Lade…</div>}

        {data && data.totalsByAccount.map(acc => {
          const assets = (data.assetsByAccount || []).filter(a => a.accountId === acc.accountId);

          return (
            <div key={acc.accountId} className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {acc.name} <span className="text-xs opacity-70">({acc.baseCurrency})</span>
                </div>
                <div className="text-right">
                  <div className="text-sm">Cash: {acc.cash.toLocaleString("de-DE")} {acc.baseCurrency}</div>
                  <div className="text-sm">Assets: {(acc.assetsValueEUR ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" })}</div>
                  <div className="font-semibold">Total: {(acc.totalEUR ?? 0).toLocaleString("de-DE", { style: "currency", "currency":"EUR" })}</div>
                </div>
              </div>

              {/* Quick-Aktionen */}
              <div className="flex flex-wrap gap-2">
                <AddSavingsTransactionModal
                  userId={userId}
                  onSaved={() => setRefreshKey(k => k + 1)}
                  refreshKey={refreshKey}
                  defaultAccountId={acc.accountId}
                  defaultKind="cash_deposit"
                  triggerLabel="Einzahlung"
                />
                <AddSavingsTransactionModal
                  userId={userId}
                  onSaved={() => setRefreshKey(k => k + 1)}
                  refreshKey={refreshKey}
                  defaultAccountId={acc.accountId}
                  defaultKind="asset_buy"
                  triggerLabel="Kauf (Asset)"
                />
                <AddSavingsTransactionModal
                  userId={userId}
                  onSaved={() => setRefreshKey(k => k + 1)}
                  refreshKey={refreshKey}
                  defaultAccountId={acc.accountId}
                  defaultKind="asset_sell"
                  triggerLabel="Verkauf (Asset)"
                />
              </div>

              {/* Asset-Tabelle mit PnL */}
              {assets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2">Asset</th>
                        <th className="py-2">Units</th>
                        <th className="py-2">Ø-EK (lokal)</th>
                        <th className="py-2">Preis (EUR)</th>
                        <th className="py-2">Wert (EUR)</th>
                        <th className="py-2">Cost Basis (EUR)</th>
                        <th className="py-2 text-right">PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((a, i) => {
                        const pnl = a.pnlAbsEUR ?? 0;
                        const pct = a.pnlPct != null ? (a.pnlPct * 100) : null;
                        const color = a.pnlAbsEUR == null ? "text-yellow-600"
                                     : pnl > 0 ? "text-green-600"
                                     : pnl < 0 ? "text-red-600"
                                     : "text-gray-600";
                        return (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2">
                              {a.asset.symbol}{a.asset.name ? ` – ${a.asset.name}` : ""}{" "}
                              <span className="text-xs opacity-60">({a.asset.class})</span>
                            </td>
                            <td className="py-2">{a.units}</td>
                            <td className="py-2">
                              {a.avgCost != null ? a.avgCost.toLocaleString("de-DE") : "–"}
                            </td>
                            <td className="py-2">
                              {a.priceEUR != null
                                ? a.priceEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
                                : <span className="text-yellow-600">Preis fehlt</span>}
                            </td>
                            <td className="py-2">
                              {a.valueEUR != null
                                ? a.valueEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
                                : "–"}
                            </td>
                            <td className="py-2">
                              {a.costBasisEUR != null ? a.costBasisEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) : "–"}
                            </td>
                            <td className="py-2 text-right">
                              {a.pnlAbsEUR != null ? (
                                <span className={color}>
                                  {a.pnlAbsEUR.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                                  {pct != null ? ` (${pct.toFixed(2)}%)` : ""}
                                </span>
                              ) : (
                                <span className={color}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm opacity-70">Keine Assets in diesem Konto.</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
