// components/trading1/trades/sections/TradeBaseSection.tsx
"use client";

import * as React from "react";
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
import { Badge } from "@/components/ui/badge";

import type { TradingSetup } from "../../interface";
import type { TradeEntryFormValues } from "../TradeEntryForm.types";

type Props = {
  form: UseFormReturn<TradeEntryFormValues>;
  isEdit: boolean;
  setups: TradingSetup[];
};

export default function TradeBaseSection({ form, isEdit, setups }: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Trade-Basis</h3>
        <Badge variant="outline">{isEdit ? "Trade bearbeiten" : "Neuer Trade"}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Datum</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Symbol / Markt</FormLabel>
              <FormControl>
                <Input placeholder="z.B. NAS100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="session"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session</FormLabel>
              <Select value={field.value ?? "other"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Session wählen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="asia">Asia</SelectItem>
                  <SelectItem value="london">London</SelectItem>
                  <SelectItem value="new_york">New York</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="setupLabel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setup-Name (optional)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 4H Indication Long @ EQH" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="setupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setup-Verknüpfung</FormLabel>
              <Select
                value={field.value ?? "none"}
                onValueChange={(val) => {
                  if (val === "none") {
                    field.onChange(undefined);
                    form.setValue("setupLabel", "");
                    return;
                  }
                  field.onChange(val);
                  const s = setups.find((st) => st._id && String(st._id) === val);
                  if (s) form.setValue("setupLabel", s.setupLabel ?? "");
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Setup wählen (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Kein Setup verknüpft</SelectItem>
                  {setups.map((s) => (
                    <SelectItem
                      key={s._id ?? s.setupLabel ?? s.market}
                      value={String(s._id)}
                    >
                      {s.setupLabel ?? "Setup"} {s.market ? `· ${s.market}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account (optional)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. FTMO Swing" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
