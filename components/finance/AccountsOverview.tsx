// AccountsOverview.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddSavingsTransactionModal from "./AddSavingsTransactionModal";

type HoldingAsset = {
  accountId: string;
  asset: { class: "crypto" | "stock" | "etf" | "other"; symbol: string; name?: string };
  units: number;
  avgCost: number | null; // in Account-Währung
  priceEUR: number | null;
  valueEUR: number | null;
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
  const [loading, setLoading] = useState(false);

  const eur = useMemo(
    () => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
    []
  );

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/finance/holdings?userId=${userId}`);
      if (!r.ok) throw new Error("Fetch failed");
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshKey]);

  const asOf = data?.priceAsOf
    ? `Stand: ${new Date(data.priceAsOf).toLocaleDateString("de-DE")}`
    : "";

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-gray-900 dark:text-gray-100">
            Konten & Vermögen
          </CardTitle>
          <div className="flex items-center gap-3">
            {asOf && <div className="text-sm opacity-70">{asOf}</div>}
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Aktualisiere…" : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="text-xl sm:text-2xl font-semibold">
          Gesamtvermögen: {eur.format(data?.netWorthEUR ?? 0)}
        </div>

        {data?.valuationIncomplete && (
          <div className="text-sm mt-1 rounded bg-yellow-100 text-yellow-900 px-2 py-1">
            Achtung: Für einige Assets fehlen Preise. Net Worth ist ggf. unterschätzt.
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && <div className="text-sm opacity-70">Lade…</div>}
        {!loading && !data && <div className="text-sm opacity-70">Keine Daten geladen.</div>}
        {!loading && data && data.totalsByAccount.length === 0 && (
          <div className="text-sm opacity-70">Noch keine Konten/Assets vorhanden.</div>
        )}

        {data &&
          data.totalsByAccount.map((acc) => {
            const assets = (data.assetsByAccount || []).filter(
              (a) => a.accountId === acc.accountId
            );

            return (
              <div
                key={acc.accountId}
                className="border rounded-lg p-3 space-y-3 bg-white dark:bg-zinc-900 w-full max-w-full"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="font-medium">
                    {acc.name}{" "}
                    <span className="text-xs opacity-70">({acc.baseCurrency})</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm">
                      Cash: {acc.cash.toLocaleString("de-DE")} {acc.baseCurrency}
                    </div>
                    <div className="text-sm">Assets: {eur.format(acc.assetsValueEUR ?? 0)}</div>
                    <div className="font-semibold">Total: {eur.format(acc.totalEUR ?? 0)}</div>
                  </div>
                </div>

                {/* Quick-Aktionen */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                  <AddSavingsTransactionModal
                    userId={userId}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                    refreshKey={refreshKey}
                    defaultAccountId={acc.accountId}
                    defaultKind="cash_deposit"
                    triggerLabel="Einzahlung"
                  />
                  <AddSavingsTransactionModal
                    userId={userId}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                    refreshKey={refreshKey}
                    defaultAccountId={acc.accountId}
                    defaultKind="asset_buy"
                    triggerLabel="Kauf (Asset)"
                  />
                  <AddSavingsTransactionModal
                    userId={userId}
                    onSaved={() => setRefreshKey((k) => k + 1)}
                    refreshKey={refreshKey}
                    defaultAccountId={acc.accountId}
                    defaultKind="asset_sell"
                    triggerLabel="Verkauf (Asset)"
                  />
                </div>

                {/* Responsive Asset-Liste: Tabelle ab md, Liste auf xs/sm */}
                {assets.length > 0 ? (
                  <>
                    {/* Mobile/Little screens: stacked list */}
                    <div className="md:hidden space-y-2">
                      {assets.map((a, i) => {
                        const pnl = a.pnlAbsEUR ?? 0;
                        const pct = a.pnlPct != null ? a.pnlPct * 100 : null;
                        const color =
                          a.pnlAbsEUR == null
                            ? "text-yellow-600"
                            : pnl > 0
                            ? "text-green-600"
                            : pnl < 0
                            ? "text-red-600"
                            : "text-gray-600";
                        return (
                          <div
                            key={i}
                            className="rounded border p-2 text-sm grid grid-cols-2 gap-x-2 gap-y-1"
                          >
                            <div className="col-span-2 font-medium break-words">
                              {a.asset.symbol}
                              {a.asset.name ? ` – ${a.asset.name}` : ""}{" "}
                              <span className="text-xs opacity-60">({a.asset.class})</span>
                            </div>
                            <div className="opacity-70">Units</div>
                            <div className="text-right">{a.units}</div>

                            <div className="opacity-70">Ø-EK (lokal)</div>
                            <div className="text-right">
                              {a.avgCost != null ? a.avgCost.toLocaleString("de-DE") : "–"}
                            </div>

                            <div className="opacity-70">Preis (EUR)</div>
                            <div className="text-right">
                              {a.priceEUR != null ? eur.format(a.priceEUR) : "Preis fehlt"}
                            </div>

                            <div className="opacity-70">Wert (EUR)</div>
                            <div className="text-right">
                              {a.valueEUR != null ? eur.format(a.valueEUR) : "–"}
                            </div>

                            <div className="opacity-70">Cost Basis (EUR)</div>
                            <div className="text-right">
                              {a.costBasisEUR != null ? eur.format(a.costBasisEUR) : "–"}
                            </div>

                            <div className="opacity-70">PnL</div>
                            <div className={`text-right ${color}`}>
                              {a.pnlAbsEUR != null ? eur.format(a.pnlAbsEUR) : "—"}
                              {pct != null ? ` (${pct.toFixed(2)}%)` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop/tablet: table */}
                    <div className="hidden md:block overflow-x-auto">
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
                            const pct = a.pnlPct != null ? a.pnlPct * 100 : null;
                            const color =
                              a.pnlAbsEUR == null
                                ? "text-yellow-600"
                                : pnl > 0
                                ? "text-green-600"
                                : pnl < 0
                                ? "text-red-600"
                                : "text-gray-600";
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-2">
                                  {a.asset.symbol}
                                  {a.asset.name ? ` – ${a.asset.name}` : ""}{" "}
                                  <span className="text-xs opacity-60">
                                    ({a.asset.class})
                                  </span>
                                </td>
                                <td className="py-2">{a.units}</td>
                                <td className="py-2">
                                  {a.avgCost != null
                                    ? a.avgCost.toLocaleString("de-DE")
                                    : "–"}
                                </td>
                                <td className="py-2">
                                  {a.priceEUR != null ? (
                                    eur.format(a.priceEUR)
                                  ) : (
                                    <span className="text-yellow-600">Preis fehlt</span>
                                  )}
                                </td>
                                <td className="py-2">
                                  {a.valueEUR != null ? eur.format(a.valueEUR) : "–"}
                                </td>
                                <td className="py-2">
                                  {a.costBasisEUR != null
                                    ? eur.format(a.costBasisEUR)
                                    : "–"}
                                </td>
                                <td className="py-2 text-right">
                                  {a.pnlAbsEUR != null ? (
                                    <span className={color}>
                                      {eur.format(a.pnlAbsEUR)}
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
                  </>
                ) : (
                  <div className="text-sm opacity-70">
                    Keine Assets in diesem Konto.
                  </div>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
