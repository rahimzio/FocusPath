// components/trading1/setup/SetupFormSections.tsx
"use client";

import * as React from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import type { SetupFormValues } from "@/pages/api/trading/setups/setup-form-schema";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import GamePicker from "../GamePicker";
import { Button } from "@/components/ui/button";

type FormType = UseFormReturn<SetupFormValues>;
type SetupGameGrade = "S" | "A" | "B" | "C";

interface SectionProps {
  form: FormType;
  isEdit?: boolean;
  status?: string;
}

/** =========================================================
 *  Helpers
 *  ========================================================= */
function makeId(prefix = "id") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** =========================================================
 *  SECTION 1 – Basis & Kontext
 *  ========================================================= */
function SetupBasicSection({ form, isEdit }: SectionProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Basis & Kontext</h3>
        <Badge variant="outline">{isEdit ? "Setup bearbeiten" : "Neues Setup"}</Badge>
      </div>

      {/* ✅ Daytrade vs Swingtrade */}
      <FormField
        control={form.control}
        name="tradeType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Trade-Typ</FormLabel>
            <Select value={(field.value as any) ?? ""} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Bitte wählen" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="daytrade">Daytrade</SelectItem>
                <SelectItem value="swingtrade">Swingtrade</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Du musst genau <b>eines</b> auswählen.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="chartImageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Chart-Screenshot (URL)</FormLabel>
            <FormControl>
              <Input placeholder="https://tradingview.com/..." {...field} />
            </FormControl>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Später können wir hier Upload integrieren. Aktuell: TradingView-/Broker-Screenshot-URL einfügen.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="market"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Markt</FormLabel>
              <FormControl>
                <Input placeholder="z.B. NAS100, XAUUSD, BTCUSD" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Richtung</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Richtung wählen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="htfTf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTF (Higher TF)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="D1">D1</SelectItem>
                  <SelectItem value="H4">H4</SelectItem>
                  <SelectItem value="H1">H1</SelectItem>
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
          name="htfBias"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTF Bias (gesamt)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bullish">Bullish</SelectItem>
                  <SelectItem value="bearish">Bearish</SelectItem>
                  <SelectItem value="range">Range</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entryTf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry TF</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="M15">M15</SelectItem>
                  <SelectItem value="M5">M5</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Higher Timeframe Bias – D1 / H4 / H1
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="htfD1Bias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>D1 Bias</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="htfH4Bias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>H4 Bias</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="htfH1Bias"
            render={({ field }) => (
              <FormItem>
                <FormLabel>H1 Bias</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bullish">Bullish</SelectItem>
                    <SelectItem value="bearish">Bearish</SelectItem>
                    <SelectItem value="range">Range</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="waitFor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Worauf wartest du?</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="z.B. 1H BOS + 15m HH/HL, Liquidity-Sweep über EQH, dann Confirmation-Entry..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** =========================================================
 *  SECTION 2 – Setup & Struktur
 *  ========================================================= */
function SetupStructureSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Setup & Struktur</h3>

      <div className="grid gap-4 md:grid-cols-2">
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
          name="patternType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setup-Typ</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Indication + Continuation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="structureNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Struktur & Story</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Kurzbeschreibung: BOS, EQH/EQL, Liquidity, Trendteil etc."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** =========================================================
 *  SECTION 3 – Plan
 *  - Entry Range
 *  - Stop (optional)
 *  - Planned Targets Builder: TP1/TP2/TP3/Runner (+ buyer/seller + label + price optional)
 *  - plannedRR + actualRR
 *  ========================================================= */
function SetupPlanSection({ form }: SectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "plannedTargets",
    keyName: "__key",
  });

  function addTarget(type: "tp1" | "tp2" | "tp3" | "runner") {
    append({
      id: makeId("pt"),
      type,
      price: "", // string im Form, wird im Submit zu number geparst
      label: type.toUpperCase(),
      side: undefined,
    } as any);
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Plan</h3>

      {/* Entry Range + Stop */}
      <div className="grid gap-4 md:grid-cols-4">
        <FormField
          control={form.control}
          name="plannedEntryMin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry min</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 18000.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plannedEntryMax"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry max</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 18100.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="plannedStop"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stop (optional)</FormLabel>
              <FormControl>
                <Input placeholder="SL (optional)" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional – kannst du auch erst beim Entry festlegen.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Planned Targets Builder */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Geplante Targets</p>
            <p className="text-xs text-muted-foreground">
              TP1/TP2/TP3 + Runner. Preis ist optional. Label frei (z.B. „Buyer Level“ / „Seller Level“).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => addTarget("tp1")}>
              + TP1
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addTarget("tp2")}>
              + TP2
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addTarget("tp3")}>
              + TP3
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => addTarget("runner")}>
              + Runner
            </Button>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Noch keine Targets. Du kannst später auch ohne Targets speichern.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((f, index) => (
              <div key={(f as any).__key} className="rounded-lg border p-3 space-y-3">
                <input type="hidden" {...form.register(`plannedTargets.${index}.id` as const)} />
                <input type="hidden" {...form.register(`plannedTargets.${index}.type` as const)} />

                <div className="grid gap-3 md:grid-cols-12">
                  {/* Type */}
                  <div className="md:col-span-2">
                    <div className="text-xs text-muted-foreground">Typ</div>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {(form.getValues(`plannedTargets.${index}.type` as const) as any) ?? "target"}
                      </Badge>
                    </div>
                  </div>

                  {/* Label */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="text-xs text-muted-foreground">Label (frei)</label>
                    <Input
                      placeholder='z.B. "Buyer Level" oder "TP1"'
                      {...form.register(`plannedTargets.${index}.label` as const)}
                    />
                  </div>

                  {/* Side */}
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs text-muted-foreground">Side (optional)</label>
                    <FormField
                      control={form.control}
                      name={`plannedTargets.${index}.side` as const}
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={(field.value as any) ?? ""}
                            onValueChange={(v) => field.onChange(v || undefined)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="buyer/seller" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="buyer">Buyer</SelectItem>
                              <SelectItem value="seller">Seller</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Price */}
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs text-muted-foreground">Preis (optional)</label>
                    <Input
                      placeholder="z.B. 18250.5"
                      {...form.register(`plannedTargets.${index}.price` as const)}
                    />
                  </div>

                  {/* Remove */}
                  <div className="md:col-span-1 flex items-end justify-end">
                    <Button type="button" size="sm" variant="outline" onClick={() => remove(index)}>
                      X
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RR */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="plannedRR"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geplantes R:R</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 3.0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actualRR"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tatsächliches R:R (optional)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 2.4" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Optional – kannst du nach dem Trade eintragen.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

/** =========================================================
 *  SECTION 4 – Entry-Checkliste (Custom)
 *  ========================================================= */
function SetupChecklistSection({ form }: SectionProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entryChecklistTemplate",
    keyName: "__key",
  });

  const template = form.watch("entryChecklistTemplate") ?? [];

  function syncAddState(id: string) {
    const current = (form.getValues("checklistState") as Record<string, boolean>) ?? {};
    if (current[id] !== undefined) return;
    form.setValue("checklistState", { ...current, [id]: false }, { shouldDirty: true });
  }

  function syncRemoveState(id?: string) {
    if (!id) return;
    const current = (form.getValues("checklistState") as Record<string, boolean>) ?? {};
    if (!(id in current)) return;

    const next = { ...current };
    delete next[id];
    form.setValue("checklistState", next, { shouldDirty: true });
  }

  function handleAddItem() {
    const id = makeId("cl");
    append({ id, label: "", description: "", required: false } as any);
    syncAddState(id);
  }

  function handleRemoveItem(index: number) {
    const id =
      (form.getValues(`entryChecklistTemplate.${index}.id`) as string | undefined) ??
      (fields[index] as any)?.id;

    remove(index);
    syncRemoveState(id);
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Entry-Checkliste</h3>
        <p className="text-xs text-muted-foreground">
          Erstelle deine eigene Checkliste. „Pflicht“ = A-Game Bedingungen.
        </p>
      </div>

      <div className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Noch keine Punkte. Füge den ersten Punkt hinzu.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((f, index) => (
              <div key={(f as any).__key} className="rounded-lg border p-3 space-y-3">
                <input type="hidden" {...form.register(`entryChecklistTemplate.${index}.id`)} />

                <div className="grid gap-3 md:grid-cols-12">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-xs text-muted-foreground">Titel</label>
                    <Input
                      placeholder="z.B. HTF Bias aligned"
                      {...form.register(`entryChecklistTemplate.${index}.label`)}
                    />
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <label className="text-xs text-muted-foreground">Beschreibung (optional)</label>
                    <Input
                      placeholder="z.B. D1 + H4 bullish, 1H Pullback"
                      {...form.register(`entryChecklistTemplate.${index}.description`)}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-end justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        {...form.register(`entryChecklistTemplate.${index}.required`)}
                      />
                      Pflicht
                    </label>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Löschen
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button type="button" size="sm" onClick={handleAddItem}>
          + Punkt hinzufügen
        </Button>
      </div>

      <FormField
        control={form.control}
        name="checklistState"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel className="text-xs text-muted-foreground">Preview (Abhaken)</FormLabel>

            {template.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Erstelle erst Punkte, dann kannst du sie abhaken.
              </p>
            ) : (
              <div className="space-y-2">
                {template.map((item: any) => {
                  const checked = (field.value ?? {})[item.id] ?? false;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border px-3 py-2"
                    >
                      <FormControl>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => {
                            field.onChange({
                              ...(field.value ?? {}),
                              [item.id]: !!value,
                            });
                          }}
                        />
                      </FormControl>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {item.label || "Unbenannter Punkt"}
                          </span>
                          {item.required && (
                            <Badge variant="outline" className="text-[10px]">
                              Pflicht
                            </Badge>
                          )}
                        </div>

                        {item.description ? (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** =========================================================
 *  SECTION 5 – Setup Game (GamePicker)
 *  ========================================================= */
function SetupGameSection({
  userId,
  selectedIds,
  setSelectedIds,
  setGrade,
  setAvgPoints,
}: {
  userId: string;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setGrade: React.Dispatch<React.SetStateAction<SetupGameGrade>>;
  setAvgPoints: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Setup Game (A/B/C Library)</h3>
        <Badge variant="outline" className="text-[10px] uppercase">
          scope: setup
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Hake Faktoren an, die das Setup qualitativ erfüllen. Diese Auswahl wird als{" "}
        <b>setupSelectedIds</b> gespeichert.
      </p>

      <GamePicker
        userId={userId}
        scope="setup"
        value={selectedIds}
        onChange={({ selectedIds, grade, avgPoints }) => {
          setSelectedIds(selectedIds);
          setGrade(grade);
          setAvgPoints(avgPoints);
        }}
      />
    </div>
  );
}

/** =========================================================
 *  SECTION 6 – Status & Gedanken + Auswertung
 *  ========================================================= */
function SetupStatusSection({ form, status }: SectionProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Status & Gedanken</h3>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="w-40">
              <FormLabel className="text-xs">Status</FormLabel>
              <Select value={field.value as string} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="triggered">Triggered</SelectItem>
                  <SelectItem value="entered">Entered</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="invalidated">Invalidated</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Kurznotiz (Detail-ThoughtLog ist im SetupDetailDialog) */}
      <FormField
        control={form.control}
        name="thoughtProcess"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gedanken-Log (kurz)</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Kurz-Notiz (optional). Detailliertes tägliches Log kommt im Setup-Detail."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {status !== "open" && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">
            Auswertung & Game
          </h4>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="decision"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Entscheidung wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="entered">Entered</SelectItem>
                      <SelectItem value="skipped_fear">Skipped – Fear</SelectItem>
                      <SelectItem value="skipped_discipline">Skipped – Disziplin</SelectItem>
                      <SelectItem value="missed_not_at_chart">Missed – nicht am Chart</SelectItem>
                      <SelectItem value="missed_unclear">Missed – Unklarheit</SelectItem>
                      <SelectItem value="invalidated_before_entry">Invalidiert vor Entry</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome (marktbezogen)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Outcome wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="big_win">Big Win</SelectItem>
                      <SelectItem value="small_win">Small Win</SelectItem>
                      <SelectItem value="be">BE</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="unclear">Unklar</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gameGrade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game (A/B/C)</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Game wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="A">A-Game</SelectItem>
                      <SelectItem value="B">B-Game</SelectItem>
                      <SelectItem value="C">C-Game</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="reflection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reflexion</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Was war das wichtigste Learning aus diesem Setup?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}

/** =========================================================
 *  ✅ WRAPPER: SetupFormSections
 *  ========================================================= */
export default function SetupFormSections({
  form,
  userId,
  isEdit,
  status,
}: {
  form: FormType;
  userId: string;
  isEdit?: boolean;
  status?: string;
}) {
  const [setupSelectedIds, setSetupSelectedIds] = React.useState<string[]>([]);
  const [setupGameGrade, setSetupGameGrade] = React.useState<SetupGameGrade>("C");
  const [setupAvgPoints, setSetupAvgPoints] = React.useState<number>(0);

  return (
    <div className="space-y-4">
      <SetupBasicSection form={form} isEdit={isEdit} />
      <SetupStructureSection form={form} />
      <SetupPlanSection form={form} />
      <SetupChecklistSection form={form} />

      <SetupGameSection
        userId={userId}
        selectedIds={setupSelectedIds}
        setSelectedIds={setSetupSelectedIds}
        setGrade={setSetupGameGrade}
        setAvgPoints={setSetupAvgPoints}
      />

      <SetupStatusSection form={form} status={status} />
    </div>
  );
}

export {
  SetupBasicSection,
  SetupStructureSection,
  SetupPlanSection,
  SetupChecklistSection,
  SetupGameSection,
  SetupStatusSection,
};
