"use client";

import React from "react";
import useSWR from "swr";
import { useFormContext } from "react-hook-form";
import { Account, BiasExec } from "@/utils/interface";

import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const SESSIONS = ["Asia", "London", "NewYork", "Overlap"] as const;
type SessionKey = (typeof SESSIONS)[number];

// FX: 0.0001, JPY: 0.01
const pipSizeFor = (symbol: string) => (/JPY/i.test(symbol) ? 0.01 : 0.0001);
const PIP_VALUE_PER_LOT = 10;

const PAIRS_LS_KEY = "tef_pairs_v1";

const MENTAL = {
  emotions: ["Neutral", "Angst", "Gier", "Wut", "Overconfidence", "Undiszipliniert", "Euphorie", "Frust"],
};

function dateOnly(d?: string) {
  if (!d) return "";
  return d.length > 10 ? d.slice(0, 10) : d;
}

export default function TEFGeneral({ userId }: { userId: string }) {
  const { control, setValue, watch } = useFormContext<any>();
  const v = watch();

  // Accounts laden
  const { data: accountData } = useSWR<{ accounts: Account[] }>(
    userId ? `/api/trading/getAllAccounts?userId=${userId}` : null,
    fetcher
  );
  const accounts = accountData?.accounts ?? [];
  const selectedAccount = accounts.find((a) => a._id === v.accountId);
  const accountCcy = selectedAccount?.currency || "";

  // Pairs lokal + Persistenz
  const [pairs, setPairs] = React.useState<string[]>(["EURUSD", "GBPUSD", "BTCUSD"]);
  const [newPair, setNewPair] = React.useState("");

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(PAIRS_LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        setPairs(parsed);
      }
    } catch { }
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem(PAIRS_LS_KEY, JSON.stringify(pairs));
    } catch { }
  }, [pairs]);

  const addPair = () => {
    const s = newPair.trim().toUpperCase();
    if (!s) return;
    if (!pairs.includes(s)) setPairs((arr) => [...arr, s]);
    setNewPair("");
  };

  // Auto-Berechnungen
  const [autoLoss, setAutoLoss] = React.useState(true);
  const [autoRR, setAutoRR] = React.useState(true);

  const num = (x: any) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  };

  const priceStep = React.useMemo(() => pipSizeFor(String(v.symbol || "")), [v.symbol]);

  const calcRiskMoney = React.useCallback(() => {
    const entry = num(v.entry);
    const lots = Number.isFinite(Number(v.lotSize)) ? Number(v.lotSize) : 0;
    const symbol = String(v.symbol || "");
    const stop =
      v.stopPrice !== undefined && v.stopPrice !== null && v.stopPrice !== ""
        ? num(v.stopPrice)
        : num(v.exit);
    if (!entry || !stop || !symbol || !lots) return 0;

    const pips = Math.abs(entry - stop) / pipSizeFor(symbol);
    const money = pips * PIP_VALUE_PER_LOT * lots;
    return Math.round(money * 100) / 100;
  }, [v.entry, v.stopPrice, v.exit, v.lotSize, v.symbol]);

  const calcRR = React.useCallback(() => {
    const entry = num(v.entry);
    const lots = Number.isFinite(Number(v.lotSize)) ? Number(v.lotSize) : 0;
    const symbol = String(v.symbol || "");
    if (!entry || !symbol || !lots) return "";

    const risk = calcRiskMoney();
    if (risk <= 0) return "";

    const a = v.followedSetup === true ? 1 : 0;
    const b = v.respectedStopLoss === true ? 1 : 0;
    const c = v.managedRisk === true ? 1 : 0;
    const score = Math.round(((a + b + c) / 3) * 100);
    setValue("disciplineScore", score)

    const hasTarget =
      v.targetPrice !== undefined && v.targetPrice !== null && v.targetPrice !== "";
    const target = hasTarget ? num(v.targetPrice) : num(v.exit);

    let rewardMoney = 0;

    if (hasTarget || target) {
      const pipsReward = Math.abs(target - entry) / pipSizeFor(symbol);
      rewardMoney = pipsReward * PIP_VALUE_PER_LOT * lots;
    } else {
      const pnlAbs = Math.abs(num(v.pnl));
      if (pnlAbs > 0) rewardMoney = pnlAbs;
    }

    if (!Number.isFinite(rewardMoney) || rewardMoney <= 0) return "";
    const ratio = rewardMoney / risk;
    if (!Number.isFinite(ratio) || ratio <= 0) return "";

    return `1:${(Math.round(ratio * 100) / 100).toFixed(2)}`;
  }, [v.entry, v.exit, v.targetPrice, v.lotSize, v.symbol, v.pnl, calcRiskMoney]);

  React.useEffect(() => {
    if (!autoLoss) return;
    const loss = calcRiskMoney();
    if (num(v.potentialLoss) !== loss) setValue("potentialLoss", loss, { shouldDirty: true });
  }, [autoLoss, calcRiskMoney, v.potentialLoss, setValue]);

  React.useEffect(() => {
    if (!autoRR) return;
    const rr = calcRR();
    if (rr && v.riskReward !== rr) setValue("riskReward", rr, { shouldDirty: true });
  }, [autoRR, calcRR, v.riskReward, setValue]);

  React.useEffect(() => {
    const a = v.followedSetup === true ? 1 : 0;
    const b = v.respectedStopLoss === true ? 1 : 0;
    const c = v.managedRisk === true ? 1 : 0;
    const score = Math.round(((a + b + c) / 3) * 100);
    if (v.disciplineScore !== score) {
      setValue("disciplineScore", score, { shouldDirty: true });
    }
  }, [v.followedSetup, v.respectedStopLoss, v.managedRisk, v.disciplineScore, setValue]);

  const pieData = [
    { name: "Disziplin", value: v.disciplineScore || 0 },
    { name: "Fehler", value: 100 - (v.disciplineScore || 0) },
  ];
  const COLORS = ["#10b981", "#e5e7eb"];


  /* ---- Teil-Exits (Zeit & Notizen entfernt) ---- */
  const partials: any[] = Array.isArray(v.partialExits) ? v.partialExits : [];
  const percentSum = partials.reduce((acc, it) => {
    const n = Number(it?.percent);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  const addPartial = () => {
    const remaining = Math.max(0, 100 - percentSum);
    const arr = [
      ...partials,
      {
        label: `TP ${partials.length + 1}`,
        price: undefined,
        percent: remaining > 0 ? Number(remaining.toFixed(2)) : undefined,
        // ✅ at & note entfernt
      },
    ];
    setValue("partialExits", arr, { shouldDirty: true });
  };

  const removePartial = (idx: number) => {
    const arr = [...partials];
    arr.splice(idx, 1);
    setValue("partialExits", arr, { shouldDirty: true });
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Account */}
        <FormField
          control={control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Account wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id!}>
                        {a.name || a._id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Datum unter Account */}
        <FormField
          control={control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={dateOnly(field.value)}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start/End/Session */}
        <FormField control={control} name="startTime" render={({ field }) => (
          <FormItem>
            <FormLabel>Startzeit</FormLabel>
            <FormControl><Input type="time" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="endTime" render={({ field }) => (
          <FormItem>
            <FormLabel>Endzeit</FormLabel>
            <FormControl><Input type="time" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={control} name="session" render={({ field }) => (
          <FormItem>
            <FormLabel>Session</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Session wählen" /></SelectTrigger>
                <SelectContent>
                  {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Symbol */}
        <FormField
          control={control}
          name="symbol"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Währungspaar</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  placeholder="z. B. EURUSD"
                  className="flex-1"
                  inputMode="text"
                />
                <Select onValueChange={(val) => field.onChange(val)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Aus Liste…" />
                  </SelectTrigger>
                  <SelectContent>
                    {pairs.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newPair}
                  onChange={(e) => setNewPair(e.target.value)}
                  placeholder="Neues Paar (z. B. GBPJPY)"
                  className="flex-1"
                  inputMode="text"
                />
                <Button type="button" variant="secondary" onClick={addPair}>
                  Hinzufügen
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buy/Sell */}
        <FormField
          control={control}
          name="tradeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buy / Sell</FormLabel>
              <FormControl>
                <Select value={field.value || "buy"} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Entry/Exit/PnL/Lot */}
        <FormField
          control={control}
          name="entry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={priceStep}
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="exit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exit (realisiert)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={priceStep}
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="pnl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Realized PnL {accountCcy ? `(${accountCcy})` : ""}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="lotSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lot Size (optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Stop-Preis & Ziel-Preis */}
        <FormField
          control={control}
          name="stopPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stop-Preis (SL)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={priceStep}
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="optional, verbessert Auto-Berechnungen"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="targetPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ziel-Preis (TP)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={priceStep}
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="optional, für Auto R:R"
                />
              </FormControl>
              <FormMessage />

              {/* ✅ Teil-Exits: nur Label / Preis / % schließen */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!v.hasPartialExits}
                      onCheckedChange={(checked) => {
                        setValue("hasPartialExits", !!checked, { shouldDirty: true });
                        if (!checked) setValue("partialExits", [], { shouldDirty: true });
                      }}
                    />
                    Teil-Exits (TPs) verwenden
                  </label>
                  {v.hasPartialExits ? (
                    <div className="text-xs">
                      Summe:&nbsp;
                      <span className={percentSum > 100 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
                        {percentSum.toFixed(2)}%
                      </span>
                      {percentSum > 100 && <span className="text-red-600 ml-2">– max. 100%</span>}
                    </div>
                  ) : null}
                </div>

                {v.hasPartialExits ? (
                  <div className="space-y-2">
                    {(partials as any[]).map((p, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end border p-2 rounded-lg">
                        <div className="md:col-span-3">
                          <FormLabel className="text-xs">Label</FormLabel>
                          <Input
                            value={p?.label ?? ""}
                            onChange={(e) => {
                              const arr = [...partials];
                              arr[idx] = { ...(arr[idx] || {}), label: e.target.value };
                              setValue("partialExits", arr, { shouldDirty: true });
                            }}
                            placeholder={`TP ${idx + 1}`}
                          />
                        </div>
                        <div className="md:col-span-3">
                          <FormLabel className="text-xs">Preis</FormLabel>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step={priceStep}
                            value={p?.price ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const arr = [...partials];
                              arr[idx] = {
                                ...(arr[idx] || {}),
                                price: val === "" ? (undefined as any) : Number(val),
                              };
                              setValue("partialExits", arr, { shouldDirty: true });
                            }}
                            placeholder="z. B. 1.2560"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <FormLabel className="text-xs">% schließen</FormLabel>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={p?.percent ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const arr = [...partials];
                              arr[idx] = {
                                ...(arr[idx] || {}),
                                percent: val === "" ? (undefined as any) : Number(val),
                              };
                              setValue("partialExits", arr, { shouldDirty: true });
                            }}
                            placeholder="z. B. 50"
                          />
                        </div>

                        <div className="md:col-span-8 flex justify-end">
                          <Button type="button" variant="ghost" onClick={() => removePartial(idx)}>
                            Entfernen
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between">
                      <Button type="button" variant="secondary" onClick={addPartial}>
                        TP hinzufügen
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Outcome-Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <FormField control={control} name="outcomeFlags.stopHit" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="m-0">Stop-Loss getroffen</FormLabel>
                  </FormItem>
                )} />
                <FormField control={control} name="outcomeFlags.breakEven" render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="m-0">Break Even</FormLabel>
                  </FormItem>
                )} />
              </div>
            </FormItem>
          )}
        />
        {/* ✅ Prozess-Häkchen für Disziplin (wirken auf den Kreis) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <FormField control={control} name="followedSetup" render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="m-0">Setup befolgt</FormLabel>
            </FormItem>
          )} />
          <FormField control={control} name="respectedStopLoss" render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="m-0">Stop-Loss respektiert</FormLabel>
            </FormItem>
          )} />
          <FormField control={control} name="managedRisk" render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="m-0">Risiko gemanagt</FormLabel>
            </FormItem>
          )} />
        </div>
        {/* Potentieller Verlust */}
        <FormField
          control={control}
          name="potentialLoss"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>
                  Potentieller Verlust{" "}
                  {accountCcy ? <span className="opacity-60">({accountCcy})</span> : null}
                </FormLabel>
                <label className="text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoLoss}
                    onChange={(e) => {
                      setAutoLoss(e.target.checked);
                      if (e.target.checked)
                        setValue("potentialLoss", calcRiskMoney(), { shouldDirty: true });
                    }}
                  />
                  Auto
                </label>
              </div>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    setAutoLoss(false);
                    field.onChange(e.target.value === "" ? "" : Number(e.target.value));
                  }}
                />
              </FormControl>
              <div className="text-xs opacity-60 mt-1">
                Berechnung: |Entry − SL| / PipSize × {PIP_VALUE_PER_LOT} × Lots
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Risk/Reward */}
        <FormField
          control={control}
          name="riskReward"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Risk/Reward</FormLabel>
                <label className="text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRR}
                    onChange={(e) => {
                      setAutoRR(e.target.checked);
                      if (e.target.checked) {
                        const rr = calcRR();
                        if (rr) setValue("riskReward", rr, { shouldDirty: true });
                      }
                    }}
                  />
                  Auto
                </label>
              </div>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  onChange={(e) => {
                    setAutoRR(false);
                    field.onChange(e.target.value);
                  }}
                  placeholder="z. B. 1:2.50"
                />
              </FormControl>
              <div className="text-xs opacity-60 mt-1">
                Auto: Reward aus |TP − Entry| (oder Exit), Fallback: |PnL| relativ zu |Entry − SL|
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Ergebnis */}
        <FormField
          control={control}
          name="result"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ergebnis</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="loss">Loss</SelectItem>
                    <SelectItem value="BE">BE</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Emotion */}
        <FormField
          control={control}
          name="emotionBefore"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Emotion vor dem Trade</FormLabel>
              <div
                className="flex flex-wrap gap-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                {MENTAL.emotions.map((em) => {
                  const active = field.value === em;
                  return (
                    <button
                      key={em}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        field.onChange(em);
                      }}
                      className={[
                        "px-3 py-1 rounded-md text-sm border",
                        active ? "bg-primary text-primary-foreground" : "bg-secondary"
                      ].join(" ")}
                    >
                      {em}
                    </button>
                  );
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Glück/Varianz & Prozess-Notizen */}
        <FormField control={control} name="luckFactor" render={({ field }) => (
          <FormItem>
            <FormLabel>Glück / Varianz (optional)</FormLabel>
            <FormControl>
              <Select value={field.value || "neutral"} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Bewertung wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positives Glück</SelectItem>
                  <SelectItem value="neutral">Keins / neutral</SelectItem>
                  <SelectItem value="negative">Negatives Glück</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="biasExecution" render={({ field }) => (
          <FormItem>
            <FormLabel>Bias/Execution</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Bias wählen" /></SelectTrigger>
                <SelectContent>
                  {(["RR", "RW", "WR", "WW"] as BiasExec[]).map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={control} name="processNotes" render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Notizen zum Trade & Denkprozess</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Kurz: Wie hast du gedacht/gefühlt? Welche Rolle spielte Varianz/Glück?"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {/* Mini-Chart */}
      <div className="w-24 mx-auto mt-6">
        <AspectRatio ratio={1}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={20} outerRadius={40}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </AspectRatio>
        <div className="text-center mt-2 text-sm">Disziplin: {v.disciplineScore ?? 0}%</div>
      </div>
    </>
  );
}
