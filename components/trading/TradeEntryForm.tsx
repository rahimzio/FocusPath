"use client";
import { useState } from "react";
import { TradeEntry } from "@/utils/interface";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  });

  const [loading, setLoading] = useState(false);
  const updateDiscipline = (values: Partial<TradeEntry>) => {
    const fs = values.followedSetup ? 1 : 0;
    const rs = values.respectedStopLoss ? 1 : 0;
    const mr = values.managedRisk ? 1 : 0;
    const score = Math.round(((fs + rs + mr) / 3) * 100);
    return score;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value =
      e.target.type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    const updated = { ...form, [e.target.name]: value } as Partial<TradeEntry>;
    updated.disciplineScore = updateDiscipline(updated);
    setForm(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const disciplineScore = updateDiscipline(form);
    const tradeSummaryText =
      form.tradeSummaryText ||
      `${form.symbol} ${form.setup} ${form.result} PnL:${form.pnl}`;
    const embeddingSourceText = `\n  ${form.symbol} ${form.setup} Entry: ${form.entry}, Exit: ${form.exit}, Result: ${form.result}.\n  Notes: ${form.notes || ""}. Reflection: ${form.reflectionNotes || ""}.\n  Tags: ${form.tags?.join(", ") || ""}. Violations: ${form.ruleViolations?.join(", ") || ""}. Emotions: ${form.emotions || ""}.\n`.trim();
    await fetch("/api/trades/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        disciplineScore,

        tradeSummaryText,
        embeddingSourceText,
        date,
        userId,
      }),
    });
    setLoading(false);
    setForm({ result: "win", followedSetup: false, respectedStopLoss: false, managedRisk: false });
    onCreated();
  };

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Neuer Trade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="block text-sm pb-1">Symbol</label>
            <Input name="symbol" onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm pb-1">Setup</label>
            <Input name="setup" onChange={handleChange} />
          </div>
          <div className="flex gap-2">
            <Input
              name="entry"
              type="number"
              placeholder="Entry"
              onChange={handleChange}
              className="flex-1"
            />
            <Input
              name="exit"
              type="number"
              placeholder="Exit"
              onChange={handleChange}
              className="flex-1"
            />
            <Input
              name="pnl"
              type="number"
              placeholder="PnL"
              onChange={handleChange}
              className="flex-1"
            />
          </div>
          <div>
            <label className="block text-sm pb-1">Ergebnis</label>
            <Select
              name="result"
              defaultValue="win"
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, result: value as any }))
              }
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
          </div>
          <details className="border rounded p-2">
            <summary className="cursor-pointer select-none">Mentale Faktoren</summary>
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-sm pb-1">Emotion vor dem Trade</label>
                <select name="emotionBefore" onChange={handleChange} className="w-full border p-1 rounded">
                  <option value="">-</option>
                  <option value="Angst">Angst</option>
                  <option value="Gier">Gier</option>
                  <option value="Stress">Stress</option>
                  <option value="Ruhe">Ruhe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm pb-1">Trigger Event</label>
                <textarea name="triggerEvent" onChange={handleChange} className="w-full border p-1 rounded" />
              </div>
              <div>
                <label className="block text-sm pb-1">Mentaler Fehler</label>
                <select name="mentalMistake" onChange={handleChange} className="w-full border p-1 rounded">
                  <option value="">-</option>
                  <option value="SL verschoben">SL verschoben</option>
                  <option value="Overtrading">Overtrading</option>
                  <option value="FOMO">FOMO</option>
                </select>
              </div>
              <div>
                <label className="block text-sm pb-1">Performance State</label>
                <select name="performanceState" onChange={handleChange} className="w-full border p-1 rounded">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="followedSetup" onChange={handleChange} checked={!!form.followedSetup} />
                  Setup befolgt
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="respectedStopLoss" onChange={handleChange} checked={!!form.respectedStopLoss} />
                  StopLoss respektiert
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="managedRisk" onChange={handleChange} checked={!!form.managedRisk} />
                  Risiko gemanagt
                </label>
              </div>
              <div className="text-sm">
                Disziplin: {form.disciplineScore || 0}
              </div>
            </div>
          </details>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading} className="ml-auto">
            {loading ? "Speichern..." : "Speichern"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}