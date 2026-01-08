// components/trading1/trades/sections/TradeParametersSection.tsx
"use client";

import type { UseFormReturn } from "react-hook-form";

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
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import type { TradeEntryFormValues } from "../TradeEntryForm.types";

type Props = {
  form: UseFormReturn<TradeEntryFormValues>;
};

export default function TradeParametersSection({ form }: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Trade-Parameter</h3>

      <div className="grid gap-4 md:grid-cols-4">
        {(["entry", "exit", "stopLoss", "positionSize"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {name === "entry"
                    ? "Entry"
                    : name === "exit"
                    ? "Exit"
                    : name === "stopLoss"
                    ? "Stop Loss"
                    : "Position Size"}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      name === "positionSize"
                        ? "Lots / Risiko €"
                        : name === "stopLoss"
                        ? "SL"
                        : `${name}-Preis`
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="result"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Result</FormLabel>
              <Select value={field.value ?? "BE"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Result" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="BE">BE</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pnl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PnL</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 250.00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating (1–10)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 7" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
