"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { TradeEntry } from "@/utils/interface";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  date: string;
  userId: string;
  onCreated: () => void;
  initialData?: TradeEntry;
}

export default function TradeEntryForm({ date, userId, onCreated, initialData }: Props) {
  // Initialize form
  const methods = useForm<TradeEntry>({
    defaultValues: {
      ...initialData,
      date,
      symbol: initialData?.symbol || "",
      entry: initialData?.entry || 0,
      exit: initialData?.exit || 0,
      pnl: initialData?.pnl || 0,
      result: initialData?.result || "win",
      setup: initialData?.setup || "",
      strategy_name: initialData?.strategy_name || "",
      confluences: initialData?.confluences || [],
      tradeType: initialData?.tradeType || "buy",
      lotSize: initialData?.lotSize || 0,
      potentialLoss: initialData?.potentialLoss || 0,
      riskReward: initialData?.riskReward || "",
      notes: initialData?.notes || "",
      emotionBefore: initialData?.emotionBefore || "",
      triggerEvent: initialData?.triggerEvent || "",
      mentalMistake: initialData?.mentalMistake || "",
      performanceState: initialData?.performanceState || "A",
      followedSetup: initialData?.followedSetup || false,
      respectedStopLoss: initialData?.respectedStopLoss || false,
      managedRisk: initialData?.managedRisk || false,
      disciplineScore: initialData?.disciplineScore || 0,
    } as any,
  });
  const { control, handleSubmit, watch, setValue } = methods;
  const formValues = watch();

  // Discipline pie
  const pieData = [
    { name: 'Disziplin', value: formValues.disciplineScore || 0 },
    { name: 'Fehler', value: 100 - (formValues.disciplineScore || 0) }
  ];
  const COLORS = ['#10b981', '#e5e7eb'];

  // Dropdown options
  const [pairs, setPairs] = useState<string[]>([]);
  const [setups, setSetups] = useState<string[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [confs, setConfs] = useState<string[]>([]);

  useEffect(() => {
    setPairs(["EURUSD", "GBPUSD", "BTCUSD"]);
    setSetups(["Breakout", "Reversal", "Trend"]);
    setStrategies(["Scalping", "Swing", "Position"]);
    setConfs(["Support", "Resistance", "Fibonacci", "RSI Divergence"]);
  }, []);

  const onSubmit = async (values: TradeEntry) => {
    await fetch("/api/trades/create", {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, userId }),
    });
    onCreated();
  };

  return (
    <FormProvider {...methods}>
      <Card className="w-full">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <CardHeader>
            <CardTitle>{initialData ? "Trade bearbeiten" : "Neuer Trade"}</CardTitle>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="general" className="space-y-4">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="strategy">Strategie</TabsTrigger>
                <TabsTrigger value="confluence">Confluences</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Symbol, tradeType, entry, exit, pnl, lotSize, potentialLoss, riskReward, notes */}
                  <FormField control={control} name="symbol" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Währungspaar</FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Paar wählen"/></SelectTrigger>
                          <SelectContent>{pairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="tradeType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buy / Sell</FormLabel>
                      <FormControl>
                        <Select value={field.value || "buy"} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Typ wählen"/></SelectTrigger>
                          <SelectContent><SelectItem value="buy">Buy</SelectItem><SelectItem value="sell">Sell</SelectItem></SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={control} name="entry" render={({ field }) => (
                    <FormItem><FormLabel>Entry</FormLabel><FormControl><Input type="number" step="0.0001" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="exit" render={({ field }) => (
                    <FormItem><FormLabel>Exit</FormLabel><FormControl><Input type="number" step="0.0001" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="pnl" render={({ field }) => (
                    <FormItem><FormLabel>PnL</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="lotSize" render={({ field }) => (
                    <FormItem><FormLabel>Lot Size</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="potentialLoss" render={({ field }) => (
                    <FormItem><FormLabel>Potentieller Verlust</FormLabel><FormControl><Input type="number" step="0.01" {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="riskReward" render={({ field }) => (
                    <FormItem><FormLabel>Risk/Reward</FormLabel><FormControl><Input {...field} placeholder="z.B. 1:2"/></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notizen</FormLabel><FormControl><Textarea rows={3} {...field}/></FormControl><FormMessage/></FormItem>
                  )} />
                </div>

                {/* Ergebnis & Mentale Faktoren & A/B/C Game & Disziplin */}
                <FormField control={control} name="result" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ergebnis</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={v => field.onChange(v)}>
                        <SelectTrigger><SelectValue placeholder="Result"/></SelectTrigger>
                        <SelectContent><SelectItem value="win">Win</SelectItem><SelectItem value="loss">Loss</SelectItem><SelectItem value="BE">BE</SelectItem></SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <details className="border rounded p-2">
                  <summary className="cursor-pointer select-none">Mentale Faktoren</summary>
                  <div className="mt-2 space-y-4">
                    <FormField control={control} name="emotionBefore" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emotion vor dem Trade</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={v => field.onChange(v)}>
                            <SelectTrigger><SelectValue placeholder="Emotion wählen"/></SelectTrigger>
                            <SelectContent><SelectItem value="Angst">Angst</SelectItem><SelectItem value="Gier">Gier</SelectItem><SelectItem value="Stress">Stress</SelectItem><SelectItem value="Ruhe">Ruhe</SelectItem></SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={control} name="mentalMistake" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mentaler Fehler</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={v => field.onChange(v)}>
                            <SelectTrigger><SelectValue placeholder="Fehler wählen"/></SelectTrigger>
                            <SelectContent><SelectItem value="SL verschoben">SL verschoben</SelectItem><SelectItem value="Overtrading">Overtrading</SelectItem><SelectItem value="FOMO">FOMO</SelectItem></SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={control} name="performanceState" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performance State (A/B/C)</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={v => field.onChange(v)}>
                            <SelectTrigger><SelectValue placeholder="Rating wählen"/></SelectTrigger>
                            <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem></SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["followedSetup", "Setup befolgt"],
                        ["respectedStopLoss", "StopLoss respektiert"],
                        ["managedRisk", "Risiko gemanagt"],
                      ] as const).map(([key, label]) => (
                        <FormField key={key} control={control} name={key} render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Checkbox checked={formValues[key] as boolean} onCheckedChange={v => setValue(key, v === true)} />
                            </FormControl>
                            <FormLabel>{label}</FormLabel>
                          </FormItem>
                        )} />
                      ))}
                    </div>
                  </div>
                </details>

                <AspectRatio ratio={1} className="w-24 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={20} outerRadius={40}>
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-2 text-sm">
                    Disziplin: {formValues.disciplineScore}%
                  </div>
                </AspectRatio>

              </TabsContent>

              <TabsContent value="setup">
                <FormField control={control} name="setup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup</FormLabel>
                    <FormControl>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Setup wählen"/></SelectTrigger>
                        <SelectContent>{setups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="strategy">
                <FormField control={control} name="strategy_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Strategie</FormLabel>
                    <FormControl>
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Strategie wählen"/></SelectTrigger>
                        <SelectContent>{strategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              <TabsContent value="confluence">
                <div className="grid grid-cols-2 gap-4">
                  {confs.map(c => (
                    <FormField key={c} control={control} name="confluences" render={() => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox checked={formValues.confluences?.includes(c)} onCheckedChange={checked => {
                            const arr = formValues.confluences || [];
                            const next = checked ? [...arr, c] : arr.filter(x => x !== c);
                            setValue("confluences", next);
                          }} />
                        </FormControl>
                        <FormLabel>{c}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-end">
            <Button type="submit">Speichern</Button>
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}
