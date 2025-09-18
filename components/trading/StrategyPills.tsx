"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Strategy = {
  _id: string;
  name: string;
  tag_color?: string;
  count?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function StrategyPills({ userId }: { userId: string }) {
  const { mutate } = useSWRConfig();
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<string | "ALL">("ALL");

  // Draft-Confluences
  const [confInput, setConfInput] = useState("");
  const [confDraft, setConfDraft] = useState<string[]>([]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const s = url.searchParams.get("strategy");
      setActive(s || "ALL");
      if (s) {
        window.dispatchEvent(new CustomEvent("strategy-select", { detail: { name: s } }));
      }
    } catch {}
    const onAccount = (e: any) => setAccountId(e?.detail?.accountId || undefined);
    window.addEventListener("account-change", onAccount as EventListener);

    const onCreated = (e: any) => {
      const name = e?.detail?.name as string | undefined;
      mutate(
        (key: any) => typeof key === "string" && key.startsWith("/api/trading/strategies"),
        undefined,
        { revalidate: true }
      );
      if (name) {
        setActive(name);
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("strategy", name);
          window.history.replaceState({}, "", url.toString());
        } catch {}
        window.dispatchEvent(new CustomEvent("strategy-select", { detail: { name } }));
      }
      setConfDraft([]);
    };

    window.addEventListener("strategy-created", onCreated as EventListener);
    return () => {
      window.removeEventListener("account-change", onAccount as EventListener);
      window.removeEventListener("strategy-created", onCreated as EventListener);
    };
  }, [mutate]);

  const key = userId
    ? `/api/trading/strategies?userId=${userId}${accountId ? `&accountId=${accountId}` : ""}`
    : null;

  const { data, error, isLoading } = useSWR<Strategy[]>(key, fetcher);
  const strategies = useMemo(() => data ?? [], [data]);

  const setUrlStrategy = (name?: string) => {
    try {
      const url = new URL(window.location.href);
      if (!name) url.searchParams.delete("strategy");
      else url.searchParams.set("strategy", name);
      window.history.replaceState({}, "", url.toString());
    } catch {}
  };

  const emitStrategy = (name?: string) => {
    window.dispatchEvent(new CustomEvent("strategy-select", { detail: { name } }));
  };

  const handleClick = (name: string) => {
    const same = active !== "ALL" && active.toLowerCase() === name.toLowerCase();
    if (same) {
      setActive("ALL");
      setUrlStrategy(undefined);
      emitStrategy(undefined);
    } else {
      setActive(name);
      setUrlStrategy(name);
      emitStrategy(name);
    }
  };

  // Confluence-Draft helpers
  function addConf() {
    const s = confInput.trim();
    if (!s) return;
    setConfDraft(prev => (prev.includes(s) ? prev : [...prev, s]));
    setConfInput("");
  }
  function removeConf(idx: number) {
    setConfDraft(prev => prev.filter((_, i) => i !== idx));
  }
  function sendToBuilder() {
    window.dispatchEvent(new CustomEvent("add-strategy:open", { detail: { confluences: confDraft } }));
  }

  return (
    <Card className="w-full max-w-full min-w-0 overflow-hidden">
      <CardHeader className="w-full max-w-full min-w-0">
        <CardTitle className="truncate">Strategies</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 w-full max-w-full min-w-0">
        {error && <div className="text-red-600">Fehler beim Laden.</div>}
        {isLoading && <div className="opacity-70">Lade…</div>}
        {!isLoading && strategies.length === 0 && (
          <div className="opacity-70">Keine Strategien gefunden.</div>
        )}

        {/* Strategie-Pills */}
        <div className="flex flex-wrap gap-2 w-full max-w-full min-w-0">
          <Button
            size="sm"
            variant={active === "ALL" ? "default" : "secondary"}
            onClick={() => {
              setActive("ALL");
              setUrlStrategy(undefined);
              emitStrategy(undefined);
            }}
            aria-pressed={active === "ALL"}
            className="min-w-0 max-w-full"
          >
            <span className="truncate">Alle</span>
          </Button>

          {strategies.map((s) => {
            const selected =
              active !== "ALL" && active.toLowerCase() === s.name.toLowerCase();
            const style =
              selected && s.tag_color ? { backgroundColor: s.tag_color, color: "white" } : undefined;
            return (
              <Button
                key={s._id}
                size="sm"
                variant={selected ? "default" : "secondary"}
                className={cn(
                  "border-0 min-w-0 max-w-full px-3 py-2", // wichtig für Shrink & Truncate
                  selected && "ring-2 ring-offset-2"
                )}
                style={style}
                title={s.count ? `${s.name} (${s.count})` : s.name}
                onClick={() => handleClick(s.name)}
                aria-pressed={selected}
                data-selected={selected ? "true" : "false"}
              >
                {/* text muss truncaten können */}
                <span className="truncate">
                  {s.name}
                  {typeof s.count === "number" ? ` · ${s.count}` : ""}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Confluence-Editor (responsiv, kein Overflow) */}
        <div className="rounded-md border p-3 w-full max-w-full min-w-0">
          <div className="text-sm font-medium mb-2">Confluences (Draft)</div>

          <div className="flex flex-col sm:flex-row gap-2 mb-2 w-full max-w-full min-w-0">
            <Input
              placeholder="Confluence eingeben und Enter…"
              value={confInput}
              onChange={(e) => setConfInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addConf();
                }
              }}
              className="w-full min-w-0"
            />
            <Button type="button" variant="secondary" onClick={addConf} className="whitespace-nowrap">
              Hinzufügen
            </Button>
          </div>

          {confDraft.length === 0 ? (
            <div className="text-sm opacity-70">Noch keine Confluences hinzugefügt.</div>
          ) : (
            <div className="flex flex-wrap gap-2 w-full max-w-full min-w-0">
              {confDraft.map((c, i) => (
                <Badge key={`${c}-${i}`} variant="secondary" className="px-2 max-w-full min-w-0">
                  <span className="truncate">{c}</span>
                  <button
                    type="button"
                    className="ml-2 opacity-70 hover:opacity-100"
                    onClick={() => removeConf(i)}
                    aria-label={`Entferne ${c}`}
                    title="Entfernen"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
            <Button type="button" variant="outline" onClick={() => setConfDraft([])}>
              Leeren
            </Button>
            <Button type="button" onClick={sendToBuilder} className="whitespace-nowrap">
              In Strategie-Builder übernehmen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
