"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { TradingSetup, TradeEntry, ThoughtLogEntry } from "../interface";
import useSWR, { mutate as globalMutate } from "swr";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

import { TradeEntryForm } from "../trades/TradeEntryForm";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

type ChecklistState = { itemId: string; checked: boolean; checkedAt?: string };

function previewChecklist(state: ChecklistState[]) {
  return state.slice(0, 4).map((x) => ({
    itemId: x.itemId,
    checked: x.checked,
    checkedAt: x.checkedAt,
  }));
}

async function patchChecklist(args: {
  userId: string;
  setupId: string;
  entryChecklistState: ChecklistState[];
}) {
  console.log("[patchChecklist] payload BEFORE send:", {
    userId: args.userId,
    setupIdRaw: args.setupId,
    setupIdStr: String(args.setupId),
    items: args.entryChecklistState.length,
    preview: previewChecklist(args.entryChecklistState),
    full: args,
  });

  const res = await fetch("/api/trading/setups/update-checklist", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const data = await res.json().catch(() => null);

  console.log("[patchChecklist] status:", res.status);
  console.log("[patchChecklist] response:", data);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to update checklist");
  }

  return data;
}

async function addThoughtLog(args: { userId: string; setupId: string; text: string }) {
  console.log("[addThoughtLog] payload BEFORE send:", {
    userId: args.userId,
    setupIdRaw: args.setupId,
    setupIdStr: String(args.setupId),
    textLen: args.text?.length ?? 0,
    textPreview: args.text?.slice(0, 80) ?? "",
  });

  const res = await fetch("/api/trading/setups/add-thought-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const data = await res.json().catch(() => null);

  console.log("[addThoughtLog] status:", res.status);
  console.log("[addThoughtLog] response:", data);

  if (!res.ok) {
    throw new Error(data?.message ?? "Failed to add thought log");
  }

  return data as { setup?: TradingSetup; entry?: ThoughtLogEntry };
}

interface SetupDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: TradingSetup | null;
}

const statusVariantMap: Record<string, "default" | "secondary" | "outline"> = {
  open: "secondary",
  triggered: "default",
  entered: "default",
  completed: "outline",
  missed: "outline",
  invalidated: "outline",
};

const directionColorMap: Record<string, string> = {
  long: "text-emerald-500",
  short: "text-red-500",
};

const tradeResultVariantMap: Record<TradeEntry["result"], "default" | "secondary" | "outline"> = {
  win: "default",
  BE: "secondary",
  loss: "outline",
};

function formatDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function dayKey(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const SetupDetailDialog: React.FC<SetupDetailDialogProps> = ({ open, onOpenChange, setup }) => {
  if (!setup) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Setup-Details</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Kein Setup ausgewählt.</p>
        </DialogContent>
      </Dialog>
    );
  }

  const userId = (setup.userId as string) ?? "";

  // ✅ Checklist template + local state
  const template = setup.entryChecklistTemplate ?? [];

  const initialChecklistState = React.useMemo<ChecklistState[]>(
    () => (Array.isArray(setup.entryChecklistState) ? (setup.entryChecklistState as any) : []),
    [setup.entryChecklistState]
  );

  const [checklistState, setChecklistState] = React.useState<ChecklistState[]>(initialChecklistState);
  const [savingChecklist, setSavingChecklist] = React.useState(false);

  React.useEffect(() => {
    setChecklistState(initialChecklistState);
  }, [initialChecklistState, setup._id]);

  function isItemChecked(id: string) {
    return !!checklistState.find((x) => x.itemId === id)?.checked;
  }

  const totalItems = template.length;

  const checkedCount = React.useMemo(() => {
    const map = new Map(checklistState.map((x) => [x.itemId, !!x.checked]));
    return template.filter((it) => map.get(it.id)).length;
  }, [checklistState, template]);

  const progressLabel = totalItems > 0 ? `${checkedCount}/${totalItems} erfüllt` : undefined;

  // ✅ Delete setup
  const [deleting, setDeleting] = React.useState(false);

  async function handleDeleteSetup() {
    if (!userId || !setup?._id) return;

    const first = window.confirm("Setup löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.");
    if (!first) return;

    const second = window.confirm("Wirklich WIRKLICH sicher?\n\nLetzte Bestätigung: Setup endgültig löschen?");
    if (!second) return;

    try {
      setDeleting(true);

      const res = await fetch("/api/trading/setups/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, setupId: String(setup._id) }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message ?? "Failed to delete setup");
      }

      await globalMutate(`/api/trading/setups/list?userId=${userId}`);
      onOpenChange(false);
    } catch (e) {
      console.error("Delete setup failed:", e);
      alert("Fehler: Setup konnte nicht gelöscht werden.");
    } finally {
      setDeleting(false);
    }
  }

  async function toggleItem(itemId: string, checked: boolean) {
    const now = new Date().toISOString();

    const next: ChecklistState[] = (() => {
      const existing = checklistState.find((x) => x.itemId === itemId);
      if (existing) {
        return checklistState.map((x) =>
          x.itemId === itemId ? { ...x, checked, checkedAt: checked ? now : x.checkedAt } : x
        );
      }
      return [...checklistState, { itemId, checked, checkedAt: checked ? now : undefined }];
    })();

    // ✅ optimistic update
    setChecklistState(next);

    console.log("[toggleItem] will patch with:", {
      userId,
      setupIdRaw: setup?._id,
      setupIdStr: String(setup?._id),
      changedItemId: itemId,
      changedChecked: checked,
      nextItems: next.length,
      nextPreview: previewChecklist(next),
    });

    if (!userId || !setup?._id) return;

    try {
      setSavingChecklist(true);

      await patchChecklist({
        userId,
        setupId: String(setup._id),
        entryChecklistState: next,
      });

      // ✅ refresh caches (list + detail)
      await globalMutate(`/api/trading/setups/list?userId=${userId}`);
      await globalMutate(`/api/trading/setups/${String(setup._id)}?userId=${userId}`);
    } catch (e) {
      // rollback
      setChecklistState(checklistState);
      console.error("Checklist update failed:", e);
    } finally {
      setSavingChecklist(false);
    }
  }

  // ✅ Thought logs local state (so UI updates instantly)
  const initialThoughtLogs = React.useMemo<ThoughtLogEntry[]>(
    () => (Array.isArray((setup as any).thoughtLogs) ? ((setup as any).thoughtLogs as ThoughtLogEntry[]) : []),
    [setup]
  );
  const [thoughtLogs, setThoughtLogs] = React.useState<ThoughtLogEntry[]>(initialThoughtLogs);
  const [thoughtText, setThoughtText] = React.useState("");
  const [savingThought, setSavingThought] = React.useState(false);

  React.useEffect(() => {
    setThoughtLogs(initialThoughtLogs);
  }, [initialThoughtLogs, setup._id]);

  const thoughtLogsSorted = React.useMemo(() => {
    return [...(thoughtLogs ?? [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [thoughtLogs]);

  const thoughtGroups = React.useMemo(() => {
    // group by day (YYYY-MM-DD)
    const groups = new Map<string, ThoughtLogEntry[]>();
    for (const e of thoughtLogsSorted) {
      const k = dayKey(e.createdAt) || "Unbekannt";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(e);
    }
    return Array.from(groups.entries()); // [day, entries]
  }, [thoughtLogsSorted]);

  async function handleAddThought() {
    if (!userId || !setup?._id) return;
    const text = thoughtText.trim();
    if (!text) return;

    // optimistic entry
    const optimistic: ThoughtLogEntry = {
      id: `tmp_${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
    };

    setSavingThought(true);
    setThoughtText("");
    setThoughtLogs((prev) => [optimistic, ...(prev ?? [])]);

    try {
      const data = await addThoughtLog({
        userId,
        setupId: String(setup._id),
        text,
      });

      // if API returns updated setup, take it
      if (data?.setup?.thoughtLogs) {
        setThoughtLogs(data.setup.thoughtLogs as any);
      } else if (data?.entry) {
        // replace optimistic with server entry
        setThoughtLogs((prev) => {
          const withoutTmp = (prev ?? []).filter((x) => !String(x.id).startsWith("tmp_"));
          return [data.entry as any, ...withoutTmp];
        });
      }

      // refresh caches (list + detail)
      await globalMutate(`/api/trading/setups/list?userId=${userId}`);
      await globalMutate(`/api/trading/setups/${String(setup._id)}?userId=${userId}`);
    } catch (e) {
      console.error("Add thought log failed:", e);
      // rollback optimistic (best-effort)
      setThoughtLogs((prev) => (prev ?? []).filter((x) => !String(x.id).startsWith("tmp_")));
      setThoughtText(text);
      alert("Fehler: Thought Log konnte nicht gespeichert werden.");
    } finally {
      setSavingThought(false);
    }
  }

  // Trades laden
  const { data: tradesData, error: tradesError, isLoading: tradesLoading, mutate: mutateTrades } = useSWR(
    open && userId && setup._id ? `/api/trading/trades/by-setup?userId=${userId}&setupId=${setup._id}` : null,
    fetcher
  );

  const linkedTrades: TradeEntry[] = tradesData?.trades ?? [];
  const [createTradeOpen, setCreateTradeOpen] = React.useState(false);

  function handleTradeCreated() {
    mutateTrades();
    setCreateTradeOpen(false);
  }

  const createdAt = setup.createdAt ? new Date(setup.createdAt as string).toLocaleString() : undefined;
  const statusVariant = statusVariantMap[setup.status] ?? "outline";

  // mini-stats
  const total = linkedTrades.length;
  const wins = linkedTrades.filter((t) => t.result === "win").length;
  const losses = linkedTrades.filter((t) => t.result === "loss").length;
  const bes = linkedTrades.filter((t) => t.result === "BE").length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const avgRR =
    total > 0
      ? linkedTrades.reduce((sum, t) => sum + ((t as any).rMultiple ?? (t as any).plannedRR ?? 0), 0) / total
      : 0;

  const avgPnL = total > 0 ? linkedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / total : 0;

  const avgRating =
    total > 0 ? Math.round((linkedTrades.reduce((sum, t) => sum + (t.rating ?? 0), 0) / total) * 10) / 10 : 0;

  const ruleBreaks = linkedTrades.filter((t: any) => t.ruleBreak || t.violatedIccRules).length;
  const reviewCount = linkedTrades.filter((t: any) => t.iccReviewNeeded).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>{setup.setupLabel ?? "Setup-Details"}</DialogTitle>

            <Button type="button" variant="destructive" size="sm" onClick={handleDeleteSetup} disabled={deleting}>
              {deleting ? "Löscht…" : "Löschen"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basis */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold leading-tight">
                  {setup.setupLabel ?? "Unbenanntes Setup"}
                </CardTitle>

                <div className="flex items-center gap-2">
                  {progressLabel && (
                    <Badge variant="outline" className="text-[10px]">
                      {progressLabel}
                    </Badge>
                  )}
                  <Badge variant={statusVariant} className="text-[10px] uppercase">
                    {setup.status}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {setup.market && <span>{setup.market}</span>}
                {setup.direction && (
                  <span className={cn("font-medium", directionColorMap[setup.direction] ?? "")}>
                    {setup.direction.toUpperCase()}
                  </span>
                )}
                {setup.htfTf && <span>HTF: {setup.htfTf}</span>}
                {setup.entryTf && <span>Entry: {setup.entryTf}</span>}
                {createdAt && <span>erstellt: {createdAt}</span>}
              </div>

              {setup.patternType && <p className="text-xs text-muted-foreground">Pattern: {setup.patternType}</p>}
            </CardHeader>
          </Card>

          {/* ✅ Gedanken Log */}
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">Gedanken-Log</CardTitle>
                {savingThought && <span className="text-[11px] text-muted-foreground">speichert…</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Schreibe Updates zur Marktlage. Jeder Eintrag bekommt automatisch Datum & Uhrzeit.
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Textarea
                  value={thoughtText}
                  onChange={(e) => setThoughtText(e.target.value)}
                  placeholder="z.B. 12:15 — Preis rejected am Level, warte auf 15m BOS…"
                  rows={3}
                />
                <Button type="button" onClick={handleAddThought} disabled={savingThought || !thoughtText.trim()}>
                  Eintrag hinzufügen
                </Button>
              </div>

              <div className="space-y-4">
                {thoughtGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Noch keine Gedanken gespeichert.</p>
                ) : (
                  thoughtGroups.map(([day, entries]) => (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">{day}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {entries.length} Einträge
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {entries.map((e) => (
                          <div key={e.id} className="rounded-lg border px-3 py-2">
                            <div className="text-[11px] text-muted-foreground">{formatDateTime(e.createdAt)}</div>
                            <div className="text-sm whitespace-pre-wrap">{e.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          {template.length > 0 && (
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">Entry-Checkliste</CardTitle>
                  <div className="flex items-center gap-2">
                    {progressLabel && (
                      <Badge variant="outline" className="text-[10px]">
                        {progressLabel}
                      </Badge>
                    )}
                    {savingChecklist && <span className="text-[11px] text-muted-foreground">speichert…</span>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Hake die Bedingungen ab – das gibt dir direkt Überblick.</p>
              </CardHeader>

              <CardContent className="space-y-2">
                {template.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 rounded-lg border px-3 py-2">
                    <Checkbox checked={isItemChecked(item.id)} onCheckedChange={(v) => toggleItem(item.id, !!v)} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        {item.required && (
                          <Badge variant="outline" className="text-[10px]">
                            Pflicht
                          </Badge>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Trades */}
          <Card className="border-dashed">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Trades aus diesem Setup</CardTitle>
                <p className="text-xs text-muted-foreground">Alle Trades, die mit diesem Setup verknüpft sind.</p>
              </div>

              {!!userId && (
                <Button size="sm" variant="outline" onClick={() => setCreateTradeOpen(true)}>
                  + Trade aus Setup loggen
                </Button>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {tradesLoading && <p className="text-xs text-muted-foreground">Trades werden geladen...</p>}
              {tradesError && <p className="text-xs text-destructive">Fehler beim Laden der Trades.</p>}

              {!tradesLoading && !tradesError && linkedTrades.length === 0 && (
                <p className="text-xs text-muted-foreground">Noch keine Trades verknüpft.</p>
              )}

              {!tradesLoading && !tradesError && linkedTrades.length > 0 && (
                <>
                  <div className="grid gap-3 md:grid-cols-4 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Trades</p>
                      <p className="text-lg font-semibold">{total}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {wins} Wins · {losses} Losses · {bes} BE
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Winrate</p>
                      <p className="text-lg font-semibold">{winRate}%</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Ø RR & PnL</p>
                      <p className="text-lg font-semibold">{avgRR.toFixed(2)}R</p>
                      <p className="text-[11px] text-muted-foreground">PnL: {avgPnL.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Qualität</p>
                      <p className="text-lg font-semibold">{avgRating || 0}/10</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ruleBreaks} Regelbrüche · {reviewCount} Review
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {linkedTrades.map((trade) => {
                      const dateLabel = trade.date ? new Date(trade.date).toLocaleDateString() : "";

                      return (
                        <div
                          key={trade._id as string}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:bg-muted/60"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{trade.symbol}</span>
                              <Badge
                                variant={tradeResultVariantMap[trade.result] ?? "outline"}
                                className="text-[10px] uppercase"
                              >
                                {trade.result}
                              </Badge>
                              {typeof trade.pnl === "number" && (
                                <span
                                  className={cn(
                                    "text-[11px]",
                                    trade.pnl > 0 && "text-emerald-500",
                                    trade.pnl < 0 && "text-red-500"
                                  )}
                                >
                                  PnL: {trade.pnl.toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              {dateLabel && <span>{dateLabel}</span>}
                              {(trade as any).gameGrade && <span>Game: {(trade as any).gameGrade}</span>}
                              {trade.rating != null && <span>Rating: {trade.rating}/10</span>}
                            </div>

                            {(trade as any).thoughts && (
                              <p className="line-clamp-2 text-[11px] text-muted-foreground">{(trade as any).thoughts}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trade create dialog */}
        {!!userId && (
          <Dialog open={createTradeOpen} onOpenChange={setCreateTradeOpen}>
            <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Trade aus diesem Setup loggen</DialogTitle>
              </DialogHeader>

              <TradeEntryForm
                userId={userId}
                mode="create"
                initialFormValues={{
                  symbol: setup.market ?? "",
                  setupLabel: setup.setupLabel ?? "",
                  setupId: (setup._id as string) ?? undefined,
                }}
                onSuccess={handleTradeCreated}
              />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SetupDetailDialog;
