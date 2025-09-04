"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { mutate } from "swr";
import TradeEntryForm from "./TradeEntryForm";

type TradeDoc = any; // optional: genauer typisieren (z.B. aus "@/utils/interface")

interface Props {
  userId: string;
  /** Optional eigenes Trigger-Element; wenn nicht gesetzt, zeige Standard-Button */
  trigger?: React.ReactNode;
  /** Optional: vorbefülltes Datum für einen neuen Trade (YYYY-MM-DD) */
  defaultDate?: string;
}

export default function AddTradeModal({ userId, trigger, defaultDate }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [initialData, setInitialData] = useState<TradeDoc | null>(null);
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const dateForForm = initialData?.date ?? defaultDate ?? today;

  const refreshCaches = useCallback(() => {
    // refresh relevante SWR keys
    mutate((key: string) => typeof key === "string" && key.startsWith("/api/trading/"));
  }, []);

  // Öffnen Create
  const openCreate = () => {
    setMode("create");
    setInitialData(null);
    setOpen(true);
  };

  // Öffnen Edit per Event
  useEffect(() => {
    const handler = async (e: Event) => {
      const custom = e as CustomEvent<{ id: string }>;
      const id = custom?.detail?.id;
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/trading/getById?id=${id}&userId=${userId}`);
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
        const json = await res.json();
        setInitialData(json.trade);
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

  const onCreated = () => {
    setOpen(false);
    setInitialData(null);
    refreshCaches();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button onClick={openCreate}>Trade hinzufügen</Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Trade bearbeiten" : "Neuer Trade"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6 opacity-70">Lade Trade…</div>
        ) : (
          <TradeEntryForm
            userId={userId}
            date={dateForForm}
            onCreated={onCreated}
            initialData={initialData || undefined}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
