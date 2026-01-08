// components/trading1/trades/sections/MetaManagementJournalSection.tsx
"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import type { IccStateTag } from "../../interface";
import type { TradeEntryFormValues } from "../TradeEntryForm.types";

type Props = {
  form: UseFormReturn<TradeEntryFormValues>;
};

export default function MetaManagementJournalSection({ form }: Props) {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">Meta, Management & Journal</h3>

      <FormField
        control={form.control}
        name="iccReviewNeeded"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
            <FormControl>
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>In ICC-Review-Queue aufnehmen</FormLabel>
              <p className="text-xs text-muted-foreground">
                Markiere diesen Trade für dein abendliches Replay / Deep Review.
              </p>
            </div>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="iccReviewNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Review-Notizen (Warum anschauen?)</FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                placeholder="z.B. spät eingestiegen, Management unsauber, HTF-Bias unsicher..."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="preScreenshotUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pre-Entry Screenshot-URL</FormLabel>
            <FormControl>
              <Input placeholder="https://tradingview.com/... (vor Entry)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="postScreenshotUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Post-Trade Screenshot-URL</FormLabel>
            <FormControl>
              <Input placeholder="https://tradingview.com/... (nach Trade)" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="screenshotUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sonstige Screenshot-URL (optional)</FormLabel>
            <FormControl>
              <Input placeholder="z.B. MFE/MAE-Chart" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Management */}
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="managementStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trade-Status</FormLabel>
              <Select value={field.value ?? "planned"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="tp1">TP1 Hit</SelectItem>
                  <SelectItem value="be">BE</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="stopped">Stopped Out</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iccTags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ICC Tags</FormLabel>
              <FormControl>
                <Input placeholder="z.B. 4H Indication, 1H HL, LTF BOS" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Komma-separiert, z.B. &quot;4H Indication, 1H HL, 15m BOS&quot;
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allgemeine Tags</FormLabel>
              <FormControl>
                <Input placeholder="z.B. london, news, breakout" {...field} />
              </FormControl>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Komma-separiert, z.B. &quot;asia, scaling, continuation&quot;
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Management-Checkboxen */}
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["managementMarkedHighsLows", "Lows/Highs im LTF markiert?"],
            ["managementTookPartialsAtTp1", "Partials bei TP1 genommen?"],
            ["managementClosedOnTrendChange", "Restposition bei Trendwechsel geschlossen?"],
            ["managementHomeTradeUntilSessionEnd", "Home Trade bis Session-Ende gehalten?"],
          ] as const
        ).map(([name, label]) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                </FormControl>
                <FormLabel className="text-xs">{label}</FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>

      {/* Psych + State */}
      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="psychReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Warum hast du getradet?</FormLabel>
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Grund wählen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="model">Model-korrekt</SelectItem>
                  <SelectItem value="fomo">FOMO</SelectItem>
                  <SelectItem value="revenge">Revenge</SelectItem>
                  <SelectItem value="boredom">Boredom</SelectItem>
                  <SelectItem value="other">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iccStateTag"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State (innerer Zustand)</FormLabel>
              <Select
                value={field.value ?? ""}
                onValueChange={(val) => field.onChange(val === "" ? "" : (val as IccStateTag))}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="State wählen (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Kein State-Tag</SelectItem>
                  <SelectItem value="focused">Focused / im Plan</SelectItem>
                  <SelectItem value="rushed">Rushed / gehetzt</SelectItem>
                  <SelectItem value="fearful">Fearful / ängstlich</SelectItem>
                  <SelectItem value="revengey">Revengey</SelectItem>
                  <SelectItem value="tired">Müde / Low Energy</SelectItem>
                  <SelectItem value="tilt">Tilt / genervt</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Wie war dein mentaler State kurz vor / während des Trades?
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="violatedIccRules"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-5">
              <FormControl>
                <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
              </FormControl>
              <FormLabel>ICC-Regeln verletzt?</FormLabel>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="psychComment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Psych-Notiz</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="FOMO? Revenge? Wie hast du dich gefühlt?" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="violatedRulesNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Welche ICC-Regeln wurden gebrochen?</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="z.B. außerhalb Session, RR < 2R, gegen Trend..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="thoughts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gedanken (kurz)</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Emotion, Fokus, Fehler – kurz festhalten" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="ruleBreakNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rule Break Notes</FormLabel>
            <FormControl>
              <Textarea rows={2} placeholder="Welche Regeln wurden verletzt? Warum?" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
{/* Psych + State */}
<div className="grid gap-4 md:grid-cols-3">
  {/* Warum hast du getradet? (Reason) */}
  <FormField
    control={form.control}
    name="psychReason"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Warum hast du getradet?</FormLabel>
        <Select
          value={field.value ?? ""}
          onValueChange={field.onChange}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Grund wählen" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="model">Model-korrekt</SelectItem>
            <SelectItem value="fomo">FOMO</SelectItem>
            <SelectItem value="revenge">Revenge</SelectItem>
            <SelectItem value="boredom">Boredom</SelectItem>
            <SelectItem value="other">Sonstiges</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />

  {/* NEU: State-Tag (focused / rushed / fearful / revengey) */}
  <FormField
    control={form.control}
    name="iccStateTag"
    render={({ field }) => (
      <FormItem>
        <FormLabel>State beim Entry</FormLabel>
        <Select
          value={field.value ?? ""}
          onValueChange={(val) =>
            field.onChange(val === "" ? "" : val)
          }
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="State wählen" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">Kein State</SelectItem>
            <SelectItem value="focused">Focused</SelectItem>
            <SelectItem value="rushed">Rushed</SelectItem>
            <SelectItem value="fearful">Fearful</SelectItem>
            <SelectItem value="revengey">Revengey</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Nutze das später für Filter, z.B. „Zeig mir alle rushed
          ICC-Trades“.
        </p>
        <FormMessage />
      </FormItem>
    )}
  />

  {/* ICC-Regeln verletzt? */}
  <FormField
    control={form.control}
    name="violatedIccRules"
    render={({ field }) => (
      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-5">
        <FormControl>
          <Checkbox
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(!!v)}
          />
        </FormControl>
        <FormLabel>ICC-Regeln verletzt?</FormLabel>
      </FormItem>
    )}
  />
</div>

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notizen</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Weitere Details zum Trade..." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
