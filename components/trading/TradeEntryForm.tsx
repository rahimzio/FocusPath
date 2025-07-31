"use client";
import React, { useState } from "react";
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
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  date: string;
  userId: string;
  onCreated: () => void;
}

export default function TradeEntryForm({ date, userId, onCreated }: Props) {
  const [form, setForm] = useState<Partial<TradeEntry>>({
    result: "win",
    followedSetup: false,
    respectedStopLoss: false,
    managedRisk: false,
    disciplineScore: 0,
  });
  const [loading, setLoading] = useState(false);

  const updateDiscipline = (values: Partial<TradeEntry>) => {
    const fs = values.followedSetup ? 1 : 0;
    const rs = values.respectedStopLoss ? 1 : 0;
    const mr = values.managedRisk ? 1 : 0;
    return Math.round(((fs + rs + mr) / 3) * 100);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Casten auf HTMLInputElement, damit .checked verfügbar ist
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    const val = type === "checkbox" ? checked : value;
    const updated = { ...form, [name]: val } as Partial<TradeEntry>;
    updated.disciplineScore = updateDiscipline(updated);
    setForm(updated);
  };

  const handleSelect = (name: keyof TradeEntry, value: any) => {
    const updated = { ...form, [name]: value } as Partial<TradeEntry>;
    updated.disciplineScore = updateDiscipline(updated);
    setForm(updated);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const disciplineScore = updateDiscipline(form);
    await fetch("/api/trades/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, disciplineScore, date, userId }),
    });
    setLoading(false);
    setForm({
      result: "win",
      followedSetup: false,
      respectedStopLoss: false,
      managedRisk: false,
      disciplineScore: 0,
    });
    onCreated();
  };

  const pieData = [
    { name: "Disziplin", value: form.disciplineScore || 0 },
    { name: "Fehler", value: 100 - (form.disciplineScore || 0) },
  ];
  const COLORS = ["#10b981", "#e5e7eb"];

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Neuer Trade</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Symbol */}
          <FormField
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Symbol</FormLabel>
                <FormControl>
                  <Input {...field} value={form.symbol || ""} onChange={handleChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Setup */}
          <FormField
            name="setup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setup</FormLabel>
                <FormControl>
                  <Input {...field} value={form.setup || ""} onChange={handleChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* entry, exit, pnl */}
          <div className="flex gap-2">
            {(["entry", "exit", "pnl"] as const).map((key) => (
              <FormField
                key={key}
                name={key}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{key.toUpperCase()}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        value={form[key] ?? ""}
                        onChange={handleChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          {/* Ergebnis */}
          <FormField
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ergebnis</FormLabel>
                <FormControl>
                  <Select
                    {...field}
                    defaultValue={form.result}
                    onValueChange={(v) => handleSelect("result", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Result" />
                    </SelectTrigger>
                    <SelectContent>
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

          {/* Mentale Faktoren */}
          <details className="border rounded p-2">
            <summary className="cursor-pointer select-none">
              Mentale Faktoren
            </summary>
            <div className="mt-2 space-y-4">
              {/* Emotion vor dem Trade */}
              <FormField
                name="emotionBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emotion vor dem Trade</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        defaultValue={form.emotionBefore}
                        onValueChange={(v) => handleSelect("emotionBefore", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Emotion wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Angst">Angst</SelectItem>
                          <SelectItem value="Gier">Gier</SelectItem>
                          <SelectItem value="Stress">Stress</SelectItem>
                          <SelectItem value="Ruhe">Ruhe</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trigger Event */}
              <FormField
                name="triggerEvent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trigger Event</FormLabel>
                    <FormControl>
                      <Input {...field} value={form.triggerEvent || ""} onChange={handleChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mentaler Fehler */}
              <FormField
                name="mentalMistake"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mentaler Fehler</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        defaultValue={form.mentalMistake}
                        onValueChange={(v) => handleSelect("mentalMistake", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Fehler wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SL verschoben">SL verschoben</SelectItem>
                          <SelectItem value="Overtrading">Overtrading</SelectItem>
                          <SelectItem value="FOMO">FOMO</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Performance State */}
              <FormField
                name="performanceState"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance State</FormLabel>
                    <FormControl>
                      <Select
                        {...field}
                        defaultValue={form.performanceState}
                        onValueChange={(v) => handleSelect("performanceState", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rating wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkboxes */}
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["followedSetup", "Setup befolgt"],
                  ["respectedStopLoss", "StopLoss respektiert"],
                  ["managedRisk", "Risiko gemanagt"],
                ] as const).map(([key, label]) => (
                  <FormField
                    key={key}
                    name={key}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={!!form[key]}
                            onCheckedChange={(v) => handleSelect(key, v)}
                          />
                        </FormControl>
                        <FormLabel>{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>
          </details>

          {/* Tortendiagramm */}
          <AspectRatio ratio={1} className="w-24 mx-auto">
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
            <div className="text-center mt-2 text-sm">
              Disziplin: {form.disciplineScore}%  
            </div>
          </AspectRatio>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? "Speichern..." : "Speichern"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
