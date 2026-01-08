"use client";

import * as React from "react";
import type { UseFormReturn } from "react-hook-form";

import { SetupFormValues } from "../../../pages/api/trading/setups/setup-form-schema";

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
import { DEFAULT_ENTRY_CHECKLIST } from "@/pages/api/trading/setups/setup-checklist";
import GamePicker from "../GamePicker";

type FormType = UseFormReturn<SetupFormValues>;

type SetupGameGrade = "S" | "A" | "B" | "C";

interface SectionProps {
  form: FormType;
  isEdit?: boolean;
  status?: string;
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
 *  ========================================================= */
function SetupPlanSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Plan</h3>

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
              <FormLabel>Stop</FormLabel>
              <FormControl>
                <Input placeholder="SL" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plannedTarget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Target</FormLabel>
              <FormControl>
                <Input placeholder="TP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="max-w-xs">
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
      </div>
    </div>
  );
}

/** =========================================================
 *  SECTION 4 – Entry-Checkliste
 *  ========================================================= */
function SetupChecklistSection({ form }: SectionProps) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Entry-Checkliste</h3>
      <p className="text-xs text-muted-foreground">
        Hake vor dem Entry die Bedingungen ab. Pflichtpunkte definieren dein A-Game.
      </p>

      <FormField
        control={form.control}
        name="checklistState"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="space-y-2">
              {DEFAULT_ENTRY_CHECKLIST.map((item) => {
                const checked = field.value?.[item.id] ?? false;
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
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.required && (
                          <Badge variant="outline" className="text-[10px]">
                            Pflicht
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

/** =========================================================
 *  SECTION 5 – Setup Game (GamePicker)
 *  - speichert selectedIds/grade/avgPoints im Parent
 *  - optional: wenn du es im RHF speichern willst -> setValue hier ergänzen
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
        Hake Faktoren an, die das Setup qualitativ erfüllen. Diese Auswahl wird als <b>setupSelectedIds</b> gespeichert.
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

      <FormField
        control={form.control}
        name="thoughtProcess"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gedanken-Log</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="Notiere über die Tage, wie du das Setup siehst, was sich ändert etc."
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
 *  - rendert alle Sektionen in Reihenfolge
 *  - hält GamePicker State (setupSelectedIds / grade / avgPoints)
 *  - hier kannst du später beim Submit die Werte an den Payload hängen
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

  // Optional: wenn du beim Edit vorhandene Werte aus dem Form initialisieren willst:
  // (setzt voraus, dass du setupSelectedIds im Schema/FormValues drin hast)
  React.useEffect(() => {
    const v = (form.getValues() as any)?.setupSelectedIds;
    if (Array.isArray(v)) setSetupSelectedIds(v.map(String));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: sync zurück ins RHF, falls du es als Field speichern willst:
  React.useEffect(() => {
    // nur wenn dein Schema das Feld kennt
if ("setupSelectedIds" in form.getValues()) {
  form.setValue("setupSelectedIds", setupSelectedIds, { shouldDirty: true });
  form.setValue("setupGameGrade", setupGameGrade, { shouldDirty: true });
  form.setValue("setupAvgPoints", setupAvgPoints, { shouldDirty: true });
}

  }, [form, setupSelectedIds, setupGameGrade, setupAvgPoints]);

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

// Optional: falls du einzelne Sections weiterhin extern importieren willst,
// kannst du sie zusätzlich exportieren. (aktuell nur intern genutzt)
export {
  SetupBasicSection,
  SetupStructureSection,
  SetupPlanSection,
  SetupChecklistSection,
  SetupGameSection,
  SetupStatusSection,
};
