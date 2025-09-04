"use client";

import * as React from "react";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  userId: string;
  value?: string[];
  onChange: (next: string[]) => void;
};

type Lib = Record<string, string[]>;

const DEFAULTS: Lib = {
  Angst: ["Nicht getradet", "Zu früh raus", "Stop zu eng"],
  Gier: ["Overtrading", "TP ignoriert", "Zu große Size"],
  Wut: ["Revenge", "Plan ignoriert", "Impulsiv eingestiegen"],
  Overconfidence: ["Setup übersehen", "Regeln gelockert", "SL verschoben"],
  Undiszipliniert: ["Kein Journal", "Kein Plan", "FOMO-Entry"],
};

export default function EmotionMistakeLibrary({ userId, value, onChange }: Props) {
  const [lib, setLib] = React.useState<Lib>(() => {
    try {
      const raw = localStorage.getItem(`emotion-lib:${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULTS;
  });
  const [active, setActive] = React.useState<string>("Angst");
  const [newItem, setNewItem] = React.useState("");

  React.useEffect(() => {
    try {
      localStorage.setItem(`emotion-lib:${userId}`, JSON.stringify(lib));
    } catch {}
  }, [lib, userId]);

  const selected = new Set(value ?? []);
  const list = lib[active] ?? [];

  return (
    <FormItem>
      <FormLabel>Mentale Fehler (aus Emotions-Bibliothek)</FormLabel>

      {/* Emotions-Tabs (leichtgewichtig) */}
      <div className="flex flex-wrap gap-2 mb-2">
        {Object.keys(lib).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={active === k ? "default" : "secondary"}
            onClick={() => setActive(k)}
          >
            {k}
          </Button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-1">
        {list.map((item, i) => (
          <label key={i} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.has(item)}
              onCheckedChange={(ck) => {
                const next = new Set(selected);
                if (ck) next.add(item);
                else next.delete(item);
                onChange(Array.from(next));
              }}
            />
            {item}
          </label>
        ))}
        {list.length === 0 && <div className="text-sm opacity-70">Keine Einträge.</div>}
      </div>

      {/* Hinzufügen */}
      <div className="flex gap-2 mt-2">
        <Input
          placeholder={`Neuer Punkt zu “${active}”`}
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newItem.trim()) {
              e.preventDefault();
              setLib((prev) => {
                const arr = [...(prev[active] ?? []), newItem.trim()];
                return { ...prev, [active]: arr };
              });
              setNewItem("");
            }
          }}
        />
        <Button
          type="button"
          onClick={() => {
            if (!newItem.trim()) return;
            setLib((prev) => {
              const arr = [...(prev[active] ?? []), newItem.trim()];
              return { ...prev, [active]: arr };
            });
            setNewItem("");
          }}
        >
          Hinzufügen
        </Button>
      </div>
    </FormItem>
  );
}
