"use client";

import * as React from "react";
import useSWR from "swr";
import { useFormContext } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type StrategySuggestion = {
  _id: string;
  name: string;
  count?: number;
  tag_color?: string;
};

const VIEW_TF = ["M5", "M15", "M30", "H1", "H4", "D1"] as const;

export default function TEFStrategy({ userId }: { userId: string }) {
  const { control, setValue, watch } = useFormContext<any>();

  /* ---------------- Strategietreue ---------------- */
  // Tri-State: "yes" | "partial" | "no"
  const setAdherence = (val: "yes" | "partial" | "no") => {
    setValue("strategyAdherence", val, { shouldDirty: true });
  };

  /* ---------------- Strategie-Name + Vorschläge ---------------- */
  const currentName: string = watch("strategy_name") ?? "";
  const [strategyName, setStrategyName] = React.useState<string>(currentName);
  React.useEffect(() => setStrategyName(currentName || ""), [currentName]);

  const { data: suggestions } = useSWR<StrategySuggestion[]>(
    userId ? `/api/trading/strategies?userId=${userId}` : null,
    fetcher
  );
  const suggestionList = suggestions ?? [];

  const onPick = (s: StrategySuggestion) => {
    setStrategyName(s.name);
    setValue("strategy_name", s.name, { shouldDirty: true });
    setValue("strategy", s.name, { shouldDirty: true }); // Kompat
  };

  /* ---------------- Confluences (Tags) ---------------- */
  const confluences: string[] = Array.isArray(watch("confluences"))
    ? watch("confluences")
    : [];
  const [confInput, setConfInput] = React.useState("");

  const addConfluence = () => {
    const raw = confInput.trim();
    if (!raw) return;
    const exists = confluences.some(
      (c) => c.toLowerCase() === raw.toLowerCase()
    );
    if (exists) {
      setConfInput("");
      return;
    }
    const next = [...confluences, raw];
    setValue("confluences", next, { shouldDirty: true });
    setConfInput("");
  };
  const removeConfluence = (c: string) => {
    const next = confluences.filter((x) => x !== c);
    setValue("confluences", next, { shouldDirty: true });
  };

  /* ---------------- View Timeframes ---------------- */
  const viewTF: string[] = Array.isArray(watch("viewTimeframes"))
    ? watch("viewTimeframes")
    : [];
  const toggleTF = (tf: string, checked: boolean) => {
    const set = new Set(viewTF);
    if (checked) set.add(tf);
    else set.delete(tf);
    setValue("viewTimeframes", Array.from(set), { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* 🆕 Strategietreue (prozess-orientiert tracken) */}
      <FormField
        control={control}
        name="strategyAdherence"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">
              Hast du dich an deine Strategie gehalten?
            </FormLabel>
            <FormControl>
              <div className="flex gap-2">
                {[
                  { key: "yes", label: "Ja" },
                  { key: "partial", label: "Teilweise" },
                  { key: "no", label: "Nein" },
                ].map((opt) => {
                  const active = (field.value ?? "") === opt.key;
                  return (
                    <Button
                      key={opt.key}
                      type="button"
                      variant={active ? "default" : "secondary"}
                      onClick={() => field.onChange(opt.key)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </div>
            </FormControl>
            <div className="text-xs text-muted-foreground mt-1">
              Diese Kennzahl hilft dir, prozess-orientiert zu tracken (unabhängig
              von PnL/Winrate).
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Strategie-Name (frei + Vorschläge) */}
      <div className="space-y-2">
        <FormField
          control={control}
          name="strategy_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategie</FormLabel>
              <FormControl>
                <Input
                  value={strategyName}
                  placeholder="z. B. London Reversal"
                  onChange={(e) => setStrategyName(e.target.value)}
                  onBlur={() => {
                    const val = strategyName.trim();
                    setValue("strategy_name", val, { shouldDirty: true });
                    setValue("strategy", val, { shouldDirty: true }); // Kompat
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!!suggestionList.length && (
          <div className="flex flex-wrap gap-2">
            {suggestionList.slice(0, 16).map((s) => {
              const style = s.tag_color
                ? { backgroundColor: s.tag_color, color: "white" }
                : undefined;
              return (
                <Button
                  key={s._id}
                  type="button"
                  size="sm"
                  variant="secondary"
                  style={style}
                  title={s.count ? `${s.name} (${s.count})` : s.name}
                  onClick={() => onPick(s)}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {s.name}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Entry Timeframe */}
      <FormField
        control={control}
        name="entryTimeframe"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Entry-Timeframe</FormLabel>
            <FormControl>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Timeframe wählen" />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_TF.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* View Timeframes (Mehrfach) */}
      <div className="space-y-2">
        <FormLabel>View-Timeframes</FormLabel>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {VIEW_TF.map((tf) => {
            const checked = viewTF.includes(tf);
            return (
              <label
                key={tf}
                className="flex items-center gap-2 text-sm border rounded-md px-2 py-1"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(val) => toggleTF(tf, val === true)}
                />
                {tf}
              </label>
            );
          })}
        </div>
      </div>

      {/* Confluences (Tags) */}
      <div className="space-y-2">
        <FormLabel>Confluences</FormLabel>
        <div className="flex gap-2">
          <Input
            value={confInput}
            onChange={(e) => setConfInput(e.target.value)}
            placeholder="z. B. Liquidity Sweep, FVG, S/R-Flip …"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addConfluence();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addConfluence}
            onMouseDown={(e) => e.preventDefault()}
          >
            Hinzufügen
          </Button>
        </div>

        {confluences.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {confluences.map((c) => (
              <span
                key={c}
                className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md flex items-center gap-2"
                title={c}
              >
                {c}
                <button
                  type="button"
                  className="opacity-70 hover:opacity-100"
                  onClick={(e) => {
                    e.preventDefault();
                    removeConfluence(c);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  aria-label={`Confluence ${c} entfernen`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="text-sm opacity-60">
            Noch keine Confluences hinzugefügt.
          </div>
        )}
      </div>
    </div>
  );
}
