// AddTradeModal.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";
import TradeEntryForm from "./TradeEntryForm";
import { TradeEntry } from "@/utils/interfaces/trading";

interface Props {
  userId: string;
  trigger?: React.ReactNode;
  defaultDate?: string;
}

/** Normalisiert evtl. Legacy-Felder für das Formular */
function normalizeTrade(doc: any): TradeEntry {
  const notes =
    Array.isArray(doc?.notes) ? doc.notes.filter(Boolean).join("\n") : (typeof doc?.notes === "string" ? doc.notes : undefined);

  return {
    ...doc,
    _id: String(doc?._id ?? ""),
    userId: String(doc?.userId ?? ""),
    date: String(doc?.date ?? "").slice(0, 10),
    notes,
  } as TradeEntry;
}

export default function AddTradeModal({ userId, trigger, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [initialData, setInitialData] = useState<TradeEntry | null>(null);
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const dateForForm = initialData?.date ?? defaultDate ?? today;

  const refreshCaches = useCallback(() => {
    // alle Trading-SWR-Keys invalidieren
    mutate((key: string) => typeof key === "string" && key.startsWith("/api/trading/"));
  }, []);

  const openCreate = () => {
    setMode("create");
    setInitialData(null);
    setOpen(true);
  };

  // Modal schließen → State aufräumen
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setMode("create");
      setInitialData(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = async (e: Event) => {
      const custom = e as CustomEvent<{ id: string }>;
      const id = custom?.detail?.id;
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/trading/getById?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Fetch failed ${res.status} ${text}`);
        }
        const json = await res.json();
        const trade = normalizeTrade(json?.trade);
        setInitialData(trade);
        setMode("edit");
        setOpen(true);
      } catch (err) {
        console.error("trade-edit load error:", err);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("trade-edit", handler as EventListener);
    return () => window.removeEventListener("trade-edit", handler as EventListener);
  }, [userId]);

  const onCreatedOrUpdated = () => {
    handleOpenChange(false);
    refreshCaches();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button onClick={openCreate}>Trade hinzufügen</Button>
        </DialogTrigger>
      )}

      {/* Responsives Modal: füllt ~95vw auf Phones */}
      <DialogContent className="w-[95vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Trade bearbeiten" : "Neuer Trade"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6 opacity-70">Lade Trade…</div>
        ) : (
          <div className="min-w-0">
            <TradeEntryForm
              userId={userId}
              date={dateForForm}
              onCreated={onCreatedOrUpdated}
              onUpdated={onCreatedOrUpdated}
              initialData={initialData || undefined}
              mode={mode}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
