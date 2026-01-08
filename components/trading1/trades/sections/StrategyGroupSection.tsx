// components/trading1/trades/sections/StrategyGroupSection.tsx
"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import type { TradeGroup } from "../../interface";
import type { TradeEntryFormValues } from "../TradeEntryForm.types";

type Props = {
  form: UseFormReturn<TradeEntryFormValues>;
  activeGroups: TradeGroup[];
  selectedGroupId?: string;
};

export default function StrategyGroupSection({
  form,
  activeGroups,
  selectedGroupId,
}: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Strategie / Gruppe (TradeZella-Style)</h3>
        {selectedGroupId && (
          <Badge variant="secondary" className="text-[10px]">
            {form.watch("groupName")}
          </Badge>
        )}
      </div>

      <FormField
        control={form.control}
        name="groupId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gruppe / Strategie</FormLabel>
            <Select
              value={field.value ?? "none"}
              onValueChange={(val) => field.onChange(val === "none" ? undefined : val)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Gruppe wählen (optional)" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Ohne Gruppe</SelectItem>
                {activeGroups.map((g) => (
                  <SelectItem key={g._id ?? g.name} value={g._id!}>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: g.color ?? "#5227ff" }}
                      />
                      <span>{g.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Gruppen verwaltest du im Tab &quot;Strategien&quot; im Trading-Dashboard.
            </p>

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
