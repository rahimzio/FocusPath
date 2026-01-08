// components/trading1/trades/sections/IccChecklistRiskSection.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
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
  isICC: boolean;
};

export default function IccChecklistRiskSection({ form, isICC }: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">ICC Checklist & Risiko</h3>

      {isICC && (
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["iccChecklistPriceAt4h", "Price an 4H-Indication / Level?"],
              ["iccChecklist1HFollowsTrend", "1H respektiert HTF-Trend (HL/LH)?"],
              ["iccChecklistBosSwing", "BOS vom relevanten Swing?"],
              ["iccChecklistTfCorrelation", "Timeframe-Korrelation passt (4H/1H/LTF)?"],
              ["iccChecklistEntryImpulseZone", "Entry aus Ursprungs-Impulse-Zone?"],
              ["iccChecklistSessionTime", "London / NY & 6–11 Uhr?"],
              [
                "iccChecklistTargetOppositeSide",
                "Target = Gegenseite (Buys zu Sellers / Sells zu Buyers)?",
              ],
            ] as const
          ).map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem
                  className={
                    name === "iccChecklistTargetOppositeSide"
                      ? "flex flex-row items-start space-x-3 space-y-0 md:col-span-2"
                      : "flex flex-row items-start space-x-3 space-y-0"
                  }
                >
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs">{label}</FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account-Typ</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Funded / Privat" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="private">Privat</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="riskPercent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Risiko %</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 1.5" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Funded: 1.5 % · Privat: 5 % max (ICC-Plan).
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plannedRR"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geplanter RR</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 3 (für 3R)" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                ICC-Ziel: mindestens 2–4R.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
