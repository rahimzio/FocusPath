"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField, FormItem, FormLabel, FormControl,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";

export default function TEFConfluence() {
  const { control, setValue, watch } = useFormContext<any>();
  const v = watch();

  // Standard-Confluences (später gern aus DB konfigurierbar machen)
  const [confs] = React.useState<string[]>([
    "Support",
    "Resistance",
    "Fibonacci",
    "RSI Divergence",
    "Liquidity Sweep",
    "Break of Structure",
    "CISD",
    "Breaker Block",
    "FVG",
  ]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {confs.map((c) => (
        <FormField
          key={c}
          control={control}
          name="confluences"
          render={() => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={!!v.confluences?.includes(c)}
                  onCheckedChange={(checked) => {
                    const current = Array.isArray(v.confluences) ? v.confluences : [];
                    const next = checked
                      ? Array.from(new Set([...current, c]))
                      : current.filter((x: string) => x !== c);
                    setValue("confluences", next, { shouldDirty: true });
                  }}
                />
              </FormControl>
              <FormLabel>{c}</FormLabel>
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
