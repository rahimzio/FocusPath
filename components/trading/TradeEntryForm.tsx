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
  const [form, setForm] = useState<Partial<TradeEntry>>({ result: "win" });
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
        const tradeSummaryText =
      form.tradeSummaryText ||
      `${form.symbol} ${form.setup} ${form.result} PnL:${form.pnl}`;
    const embeddingSourceText = `\n  ${form.symbol} ${form.setup} Entry: ${form.entry}, Exit: ${form.exit}, Result: ${form.result}.\n  Notes: ${form.notes || ""}. Reflection: ${form.reflectionNotes || ""}.\n  Tags: ${form.tags?.join(", ") || ""}. Violations: ${form.ruleViolations?.join(", ") || ""}. Emotions: ${form.emotions || ""}.\n`.trim();
    await fetch("/api/trades/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
       body: JSON.stringify({
        ...form,
        tradeSummaryText,
        embeddingSourceText,
        date,
        userId,
      }),
    });
    setLoading(false);
    setForm({ result: "win" });
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