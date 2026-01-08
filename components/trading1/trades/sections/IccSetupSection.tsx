"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradeEntryFormValues } from "../TradeEntryForm.types";
import { IccPlaybookTemplateId } from "../../interface";
import IccPlaybook, { ICC_TEMPLATES } from "../../icc/IccPlaybook";


interface IccSetupSectionProps {
  form: UseFormReturn<TradeEntryFormValues>;
  isICC: boolean;
  showPlaybook: boolean;
  onTogglePlaybook: () => void;
  selectedTemplate: IccPlaybookTemplateId | "";
}

export const IccSetupSection: React.FC<IccSetupSectionProps> = ({
  form,
  isICC,
  showPlaybook,
  onTogglePlaybook,
  selectedTemplate,
}) => {
  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold">ICC Setup</h3>
          <FormField
            control={form.control}
            name="isICC"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                  />
                </FormControl>
                <FormLabel>ICC-Trade</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-[11px]"
          onClick={onTogglePlaybook}
        >
          {showPlaybook ? "Playbook ausblenden" : "ICC Playbook anzeigen"}
        </Button>
      </div>

      {isICC && (
        <>
          {/* Template-Auswahl */}
          <FormField
            control={form.control}
            name="iccPlaybookTemplateId"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>ICC-Template</FormLabel>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(val) =>
                    field.onChange(
                      val === "" ? "" : (val as IccPlaybookTemplateId)
                    )
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Template wählen (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* ⬇️ Wichtig: leerer String statt "none" */}
                    <SelectItem value="">Kein Template</SelectItem>
                    {ICC_TEMPLATES.map((tpl: { id: React.Key | null | undefined; label: string | number | bigint | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<React.AwaitedReactNode> | null | undefined; }) => (
                      <SelectItem key={tpl.id} value={String(tpl.id)}>
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Verknüpft den Trade mit einem ICC-Template (z. B. „ICC Basic“)
                  für spätere Auswertungen.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="iccTrendHTF"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTF Trend</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Trend wählen" />
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
              name="iccTrendPart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Part of Trend</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Phase wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="indication">Indication</SelectItem>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="continuation">Continuation</SelectItem>
                      <SelectItem value="reversal">Reversal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iccTimeframeCombo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TF-Kombo</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="TF-Kombi" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="4h_1h">4H + 1H</SelectItem>
                      <SelectItem value="1h_15m">1H + 15m</SelectItem>
                      <SelectItem value="1h_5m">1H + 5m</SelectItem>
                      <SelectItem value="4h_daily">4H + Daily</SelectItem>
                      <SelectItem value="other">Andere</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="iccFourHStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>4H Status</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="4H Indication" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="above">Above Indication</SelectItem>
                      <SelectItem value="below">Below Indication</SelectItem>
                      <SelectItem value="inside">Inside Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="iccOneHStructure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>1H Struktur</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="1H Struktur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="hh_hl">HH / HL</SelectItem>
                      <SelectItem value="lh_ll">LH / LL</SelectItem>
                      <SelectItem value="range">Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </>
      )}

      {showPlaybook && (
        <div className="mt-3">
          <IccPlaybook
            selectedTemplateId={selectedTemplate || null}
            onSelectTemplate={(tplId: any) => {
              form.setValue("iccPlaybookTemplateId", tplId);
            }}
          />
        </div>
      )}
    </div>
  );
};
