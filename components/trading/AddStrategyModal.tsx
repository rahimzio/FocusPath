// AddStrategyModal.tsx
"use client";

import * as React from "react";
import { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm, FormProvider } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

type Props = { userId: string };

type StrategyPayload = {
  userId: string;
  name: string;
  description?: string;
  tag_color?: string;
  confluences?: string[];
};

export default function AddStrategyModal({ userId }: Props) {
  const [open, setOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [confluences, setConfluences] = React.useState<string[]>([]);
  const { mutate } = useSWRConfig();

  const methods = useForm<StrategyPayload>({
    defaultValues: { userId, name: "", description: "", tag_color: "#4f46e5" },
  });
  const { handleSubmit, control, setValue, reset, watch } = methods;
  const v = watch();

  React.useEffect(() => {
    const onOpen = (e: any) => {
      const items = (e?.detail?.confluences ?? []) as string[];
      setConfluences(Array.from(new Set(items.map((s) => s.trim()).filter(Boolean))));
      setOpen(true);
    };
    window.addEventListener("add-strategy:open", onOpen as EventListener);
    return () => window.removeEventListener("add-strategy:open", onOpen as EventListener);
  }, []);

  function removeConfluence(idx: number) {
    setConfluences((prev) => prev.filter((_, i) => i !== idx));
  }
  function addConfluenceManually() {
    const s = prompt("Confluence hinzufügen (Text-Tag):")?.trim();
    if (!s) return;
    setConfluences((prev) => (prev.includes(s) ? prev : [...prev, s]));
  }

  async function onSubmit(values: StrategyPayload) {
    setErrorMsg(null);
    const payload: StrategyPayload = {
      userId,
      name: String(values.name || "").trim(),
      description: values.description?.trim() || undefined,
      tag_color: values.tag_color || undefined,
      confluences,
    };
    if (!payload.name) {
      setErrorMsg("Bitte einen Strategie-Namen angeben.");
      return;
    }

    try {
      const res = await fetch("/api/trading/strategies/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      setOpen(false);
      reset({ userId, name: "", description: "", tag_color: "#4f46e5" });
      setConfluences([]);

      window.dispatchEvent(new CustomEvent("strategy-created", { detail: { name: payload.name } }));
      mutate(
        (key: any) => typeof key === "string" && key.startsWith("/api/trading/strategies"),
        undefined,
        { revalidate: true }
      );
    } catch (err: any) {
      setErrorMsg(`Konnte Strategie nicht anlegen: ${err?.message ?? err}`);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setErrorMsg(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">Strategie hinzufügen</Button>
      </DialogTrigger>

      {/* Modal responsiv + interner Scroll, damit nichts überläuft */}
      <DialogContent className="w-[96vw] sm:max-w-lg md:max-w-xl p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle>Neue Strategie erstellen</DialogTitle>
        </DialogHeader>

        {/* Scrollbarer Body */}
        <div className="max-h-[82vh] overflow-y-auto px-4 sm:px-6 pb-4 sm:pb-6 min-w-0">
          <FormProvider {...methods}>
            <form
              className="space-y-4 sm:space-y-5 min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit(onSubmit)();
              }}
            >
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Strategie-Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z. B. London Breakout"
                        {...field}
                        autoComplete="off"
                        className="min-w-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Farbe + Vorschau: auf kleinen Screens untereinander */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <FormField
                  control={control}
                  name="tag_color"
                  render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Tag-Farbe</FormLabel>
                      <FormControl>
                        <Input
                          type="color"
                          value={field.value || "#4f46e5"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-10 w-full min-w-0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end min-w-0">
                  <div
                    className="h-10 w-full rounded-md border flex items-center justify-center text-sm min-w-0"
                    style={{ backgroundColor: v.tag_color || "#4f46e5", color: "white" }}
                    title="Vorschau"
                  >
                    Vorschau
                  </div>
                </div>
              </div>

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormLabel>Beschreibung (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kurzbeschreibung deiner Strategie…"
                        {...field}
                        rows={4}
                        className="min-w-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confluences */}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <FormLabel className="m-0">Confluences</FormLabel>
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={() => setConfluences([])}>
                      Leeren
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addConfluenceManually}>
                      + Confluence
                    </Button>
                  </div>
                </div>

                {confluences.length === 0 ? (
                  <div className="text-sm opacity-70">
                    Noch keine Confluences. Öffne unten in <strong>StrategyPills</strong> den Confluence-Editor,
                    trage Tags ein und klicke „In Strategie-Builder übernehmen“.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 min-w-0">
                    {confluences.map((c, i) => (
                      <Badge
                        key={`${c}-${i}`}
                        variant="secondary"
                        className="px-2 py-1 max-w-[88vw] sm:max-w-[calc(100%-2rem)] truncate"
                        title={c}
                      >
                        <span className="truncate">{c}</span>
                        <button
                          type="button"
                          className="ml-2 opacity-70 hover:opacity-100"
                          onClick={() => removeConfluence(i)}
                          aria-label={`Entferne ${c}`}
                          title="Entfernen"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && <div className="text-sm text-red-600">{errorMsg}</div>}

              {/* Footer-Buttons – wrappt auf Mobile */}
              <div className="flex justify-end gap-2 pt-2 flex-wrap">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Abbrechen
                </Button>
                <Button type="submit">Strategie erstellen</Button>
              </div>
            </form>
          </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  );
}
