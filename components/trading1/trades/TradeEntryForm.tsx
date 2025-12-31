// components/trading1/trades/TradeEntryForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {
  TradeEntry,
  TradeGroup,
  GameGrade,
  TradingSession,
  TradeResult,
  IccTrendHTF,
  IccTrendPart,
  IccFourHStatus,
  IccOneHStructure,
  IccTimeframeCombo,
  IccPsychReason,
  TradingSetup,
  IccPlaybookTemplateId, // aus interface.ts
  IccStateTag,           // ⬅️ neu
} from "../interface";
import { cn } from "@/lib/utils";

// ⬇️ Playbook-Import (ohne Typ)
import { IccPlaybook, ICC_TEMPLATES } from "../icc/IccPlaybook";

// ------------------------------------------------------
// Types für das Formular
// ------------------------------------------------------

export interface TradeEntryFormValues {
  date: string;
  symbol: string;
  setupLabel?: string;
  setupId?: string;

  groupId?: string;
  groupName?: string;

  entry: string;
  exit: string;
  stopLoss: string;
  positionSize: string;
  result: TradeResult;
  pnl: string;
  rating: string;

  screenshotUrl?: string;
  notes?: string;
  tags?: string; // Komma-separiert im UI

  session?: TradingSession;
  accountName?: string;

  gameGrade?: GameGrade;
  thoughts?: string;
  ruleBreak?: boolean;
  ruleBreakNotes?: string;

  // -------- ICC Core --------
  isICC: boolean;
  iccTrendHTF: IccTrendHTF | "";
  iccTrendPart: IccTrendPart | "";
  iccFourHStatus: IccFourHStatus | "";
  iccOneHStructure: IccOneHStructure | "";
  iccTimeframeCombo: IccTimeframeCombo | "";

  iccChecklistPriceAt4h: boolean;
  iccChecklist1HFollowsTrend: boolean;
  iccChecklistBosSwing: boolean;
  iccChecklistTfCorrelation: boolean;
  iccChecklistEntryImpulseZone: boolean;
  iccChecklistSessionTime: boolean;
  iccChecklistTargetOppositeSide: boolean;

  // welches ICC-Playbook-Template wurde benutzt?
  iccPlaybookTemplateId?: IccPlaybookTemplateId | "";

  // -------- Risk Engine --------
  accountType?: "funded" | "private" | "";
  riskPercent: string; // wird zu number geparst
  plannedRR: string;

  // -------- Management --------
  managementStatus?:
    | "planned"
    | "active"
    | "tp1"
    | "closed"
    | "stopped"
    | "be"
    | "";
  managementMarkedHighsLows: boolean;
  managementTookPartialsAtTp1: boolean;
  managementClosedOnTrendChange: boolean;
  managementHomeTradeUntilSessionEnd: boolean;

  // -------- ICC Tags / Psych / Replay --------
  iccTags?: string; // Komma-separiert
  psychReason?: IccPsychReason | "";
  psychComment?: string;
  violatedIccRules?: boolean;
  violatedRulesNotes?: string;

  // Mentaler State (für Filter / Auswertung)
  iccStateTag?: IccStateTag | "";

  preScreenshotUrl?: string;
  postScreenshotUrl?: string;

  // Review-Queue
  iccReviewNeeded?: boolean;
  iccReviewNotes?: string;
}

interface TradeEntryFormProps {
  userId: string;
  mode?: "create" | "edit";
  initialData?: TradeEntry;
  initialFormValues?: Partial<TradeEntryFormValues>;
  onSuccess?: (trade: TradeEntry) => void;
  className?: string;
}

// ------------------------------------------------------
// Helper
// ------------------------------------------------------

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const toNumberOrUndefined = (v?: string) =>
  v && v.trim() !== "" ? Number(v) : undefined;

// API-Call: Trade anlegen
async function createTradeApi(
  url: string,
  { arg }: { arg: { userId: string; payload: any } }
): Promise<TradeEntry> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Failed to create trade");
  }

  const data = await res.json();
  return data.trade as TradeEntry;
}

// API-Call: Trade updaten
async function updateTradeApi(
  url: string,
  { arg }: { arg: { payload: any } }
): Promise<TradeEntry> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? "Failed to update trade");
  }

  const data = await res.json();
  return data.trade as TradeEntry;
}

// ------------------------------------------------------
// Haupt-Komponente
// ------------------------------------------------------

export const TradeEntryForm: React.FC<TradeEntryFormProps> = ({
  userId,
  mode = "create",
  initialData,
  initialFormValues,
  onSuccess,
  className,
}) => {
  const isEdit = mode === "edit" && !!initialData?._id;

  // Gruppen laden
  const { data: groupsData } = useSWR(
    userId ? `/api/trading/groups/list?userId=${userId}` : null,
    fetcher
  );
  const groups: TradeGroup[] = groupsData?.groups ?? [];
  const activeGroups = groups.filter((g) => g.isActive !== false);

  // Setups laden (für Dropdown-Verknüpfung)
  const { data: setupsData } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );
  const setups: TradingSetup[] = setupsData?.setups ?? [];

  const defaultValues: TradeEntryFormValues = {
    date: initialData?.date ?? new Date().toISOString().slice(0, 10),
    symbol: initialData?.symbol ?? "",
    setupLabel: initialData?.setupLabel ?? "",
    setupId: initialData?.setupId ?? undefined,

    groupId: initialData?.groupId ?? undefined,
    groupName: initialData?.groupName ?? "",

    entry: initialData?.entry !== undefined ? String(initialData.entry) : "",
    exit: initialData?.exit !== undefined ? String(initialData.exit) : "",
    stopLoss:
      initialData?.stopLoss !== undefined ? String(initialData.stopLoss) : "",
    positionSize:
      initialData?.positionSize !== undefined
        ? String(initialData.positionSize)
        : "",
    result: (initialData?.result as TradeResult) ?? "BE",
    pnl: initialData?.pnl !== undefined ? String(initialData.pnl) : "",
    rating:
      initialData?.rating !== undefined ? String(initialData.rating) : "5",

    screenshotUrl: initialData?.screenshotUrl ?? "",
    notes: initialData?.notes ?? "",
    tags: initialData?.tags?.join(", ") ?? "",

    session: initialData?.session ?? "other",
    accountName: initialData?.accountName ?? "",

    gameGrade: initialData?.gameGrade ?? undefined,
    thoughts: initialData?.thoughts ?? "",
    ruleBreak: initialData?.ruleBreak ?? false,
    ruleBreakNotes: initialData?.ruleBreakNotes ?? "",

    // ---- ICC Defaults ----
    isICC: initialData?.isICC ?? true,
    iccTrendHTF: initialData?.iccTrendHTF ?? "",
    iccTrendPart: initialData?.iccTrendPart ?? "",
    iccFourHStatus: initialData?.iccFourHStatus ?? "",
    iccOneHStructure: initialData?.iccOneHStructure ?? "",
    iccTimeframeCombo: initialData?.iccTimeframeCombo ?? "",

    iccChecklistPriceAt4h: initialData?.iccChecklistPriceAt4h ?? false,
    iccChecklist1HFollowsTrend:
      initialData?.iccChecklist1HFollowsTrend ?? false,
    iccChecklistBosSwing: initialData?.iccChecklistBosSwing ?? false,
    iccChecklistTfCorrelation:
      initialData?.iccChecklistTfCorrelation ?? false,
    iccChecklistEntryImpulseZone:
      initialData?.iccChecklistEntryImpulseZone ?? false,
    iccChecklistSessionTime:
      initialData?.iccChecklistSessionTime ?? false,
    iccChecklistTargetOppositeSide:
      initialData?.iccChecklistTargetOppositeSide ?? false,

    // Template aus dem Trade (falls schon gespeichert)
    iccPlaybookTemplateId: initialData?.iccPlaybookTemplateId ?? "",

    accountType: initialData?.accountType ?? "",
    riskPercent:
      initialData?.riskPercent !== undefined
        ? String(initialData.riskPercent)
        : "",
    plannedRR:
      initialData?.plannedRR !== undefined
        ? String(initialData.plannedRR)
        : "",

    managementStatus: initialData?.managementStatus ?? "planned",
    managementMarkedHighsLows:
      initialData?.managementMarkedHighsLows ?? false,
    managementTookPartialsAtTp1:
      initialData?.managementTookPartialsAtTp1 ?? false,
    managementClosedOnTrendChange:
      initialData?.managementClosedOnTrendChange ?? false,
    managementHomeTradeUntilSessionEnd:
      initialData?.managementHomeTradeUntilSessionEnd ?? false,

    iccTags: initialData?.iccTags?.join(", ") ?? "",
    psychReason: initialData?.psychReason ?? "",
    psychComment: initialData?.psychComment ?? "",
    violatedIccRules: initialData?.violatedIccRules ?? false,
    violatedRulesNotes: initialData?.violatedRulesNotes ?? "",

    // neu: State-Tag aus vorhandenem Trade
    iccStateTag: initialData?.iccStateTag ?? "",

    preScreenshotUrl: initialData?.preScreenshotUrl ?? "",
    postScreenshotUrl: initialData?.postScreenshotUrl ?? "",

    iccReviewNeeded: initialData?.iccReviewNeeded ?? false,
    iccReviewNotes: initialData?.iccReviewNotes ?? "",
  };

  const form = useForm<TradeEntryFormValues>({
    defaultValues: {
      ...defaultValues,
      ...initialFormValues,
    },
  });

  const { trigger: triggerCreate, isMutating: creating } = useSWRMutation(
    "/api/trading/trades/create",
    createTradeApi
  );

  const { trigger: triggerUpdate, isMutating: updating } = useSWRMutation(
    () =>
      isEdit && initialData?._id
        ? `/api/trading/trades/${initialData._id}`
        : null,
    updateTradeApi
  );

  const isSubmitting = form.formState.isSubmitting || creating || updating;

  const handleSubmitForm = form.handleSubmit(async (values) => {
    // ---------- Pflichtfeldprüfung Basic ----------
    const requiredErrors: Array<[keyof TradeEntryFormValues, string]> = [];

    if (!values.date) {
      requiredErrors.push(["date", "Datum ist erforderlich."]);
    }
    if (!values.symbol || !values.symbol.trim()) {
      requiredErrors.push(["symbol", "Symbol ist erforderlich."]);
    }
    if (!values.entry || !values.entry.trim()) {
      requiredErrors.push(["entry", "Entry ist erforderlich."]);
    }
    if (!values.stopLoss || !values.stopLoss.trim()) {
      requiredErrors.push(["stopLoss", "Stop Loss ist erforderlich."]);
    }
    if (!values.positionSize || !values.positionSize.trim()) {
      requiredErrors.push(["positionSize", "Position Size ist erforderlich."]);
    }
    if (!values.result) {
      requiredErrors.push(["result", "Result ist erforderlich."]);
    }
    if (!values.pnl || !values.pnl.trim()) {
      requiredErrors.push(["pnl", "PnL ist erforderlich."]);
    }
    if (!values.rating || !values.rating.trim()) {
      requiredErrors.push(["rating", "Rating ist erforderlich."]);
    }
    if (!values.session) {
      requiredErrors.push(["session", "Session ist erforderlich."]);
    }

    // ---------- Extra: ICC-spezifische Prüfung ----------
    if (values.isICC) {
      if (!values.iccTrendHTF) {
        requiredErrors.push([
          "iccTrendHTF",
          "ICC: HTF-Trend muss gesetzt sein.",
        ]);
      }
      if (!values.iccTrendPart) {
        requiredErrors.push([
          "iccTrendPart",
          "ICC: Part of Trend muss gewählt sein.",
        ]);
      }
      if (!values.iccFourHStatus) {
        requiredErrors.push([
          "iccFourHStatus",
          "ICC: 4H-Status muss angegeben werden.",
        ]);
      }
      if (!values.iccOneHStructure) {
        requiredErrors.push([
          "iccOneHStructure",
          "ICC: 1H-Struktur muss gewählt sein.",
        ]);
      }
      if (!values.iccTimeframeCombo) {
        requiredErrors.push([
          "iccTimeframeCombo",
          "ICC: TF-Kombination muss gewählt sein.",
        ]);
      }

      // Checklist – hart, alles muss true sein
      const checklistFields: Array<
        [keyof TradeEntryFormValues, boolean, string]
      > = [
        [
          "iccChecklistPriceAt4h",
          values.iccChecklistPriceAt4h,
          "ICC: Price muss an der 4H-Indication sein.",
        ],
        [
          "iccChecklist1HFollowsTrend",
          values.iccChecklist1HFollowsTrend,
          "ICC: 1H muss den HTF-Trend respektieren.",
        ],
        [
          "iccChecklistBosSwing",
          values.iccChecklistBosSwing,
          "ICC: BOS vom relevanten Swing ist Pflicht.",
        ],
        [
          "iccChecklistTfCorrelation",
          values.iccChecklistTfCorrelation,
          "ICC: Timeframe-Korrelation muss passen.",
        ],
        [
          "iccChecklistEntryImpulseZone",
          values.iccChecklistEntryImpulseZone,
          "ICC: Entry muss aus der Ursprungs-Impulse-Zone kommen.",
        ],
        [
          "iccChecklistSessionTime",
          values.iccChecklistSessionTime,
          "ICC: Session/Uhrzeit passt nicht zu deinem Plan.",
        ],
        [
          "iccChecklistTargetOppositeSide",
          values.iccChecklistTargetOppositeSide,
          "ICC: Target = Gegenseite (Buys to Sellers / Sells to Buyers).",
        ],
      ];

      checklistFields.forEach(([name, ok, msg]) => {
        if (!ok) {
          requiredErrors.push([name, msg]);
        }
      });
    }

    if (requiredErrors.length > 0) {
      requiredErrors.forEach(([name, message]) => {
        form.setError(name, { type: "manual", message });
      });
      return;
    }

    // ---------- Tags & ICC-Tags parsen ----------
    const tags =
      values.tags
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    const iccTags =
      values.iccTags
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? [];

    // ---------- Payload bauen ----------
    const payloadForApi = {
      ...values,
      entry: toNumberOrUndefined(values.entry) ?? 0,
      exit: toNumberOrUndefined(values.exit) ?? 0,
      stopLoss: toNumberOrUndefined(values.stopLoss) ?? 0,
      positionSize: toNumberOrUndefined(values.positionSize) ?? 0,
      pnl: toNumberOrUndefined(values.pnl) ?? 0,
      rating: toNumberOrUndefined(values.rating) ?? 0,
      riskPercent: toNumberOrUndefined(values.riskPercent),
      plannedRR: toNumberOrUndefined(values.plannedRR),
      tags,
      iccTags,
      // leeren String in undefined verwandeln, damit die DB nicht "" speichert
      iccPlaybookTemplateId: values.iccPlaybookTemplateId || undefined,
      iccStateTag: values.iccStateTag || undefined,
    };

    try {
      let trade: TradeEntry;
      if (isEdit) {
        trade = await triggerUpdate({ payload: payloadForApi });
      } else {
        trade = await triggerCreate({ userId, payload: payloadForApi });
        form.reset({
          ...defaultValues,
          ...initialFormValues,
        }); // nach Create zurücksetzen
      }
      onSuccess?.(trade);
    } catch (err) {
      console.error("Error submitting trade form", err);
    }
  });

  const selectedGroupId = form.watch("groupId");
  const isICC = form.watch("isICC");
  const selectedTemplate = form.watch(
    "iccPlaybookTemplateId"
  ) as IccPlaybookTemplateId | "";

  const [showPlaybook, setShowPlaybook] = React.useState(false);

  React.useEffect(() => {
    if (!selectedGroupId) {
      form.setValue("groupName", "");
      return;
    }
    const g = activeGroups.find((gr) => gr._id === selectedGroupId);
    if (g) {
      form.setValue("groupName", g.name);
    }
  }, [selectedGroupId, activeGroups, form]);

  return (
    <Form {...form}>
      <form
        onSubmit={handleSubmitForm}
        className={cn("space-y-6", className)}
      >
        {/* SECTION 1 – Basis */}
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Trade-Basis</h3>
            <Badge variant="outline">
              {isEdit ? "Trade bearbeiten" : "Neuer Trade"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol / Markt</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. NAS100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="session"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session</FormLabel>
                  <Select
                    value={field.value ?? "other"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Session wählen" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="asia">Asia</SelectItem>
                      <SelectItem value="london">London</SelectItem>
                      <SelectItem value="new_york">New York</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
              name="setupLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setup-Name (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="z.B. 4H Indication Long @ EQH"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Setup-Verknüpfung */}
            <FormField
              control={form.control}
              name="setupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setup-Verknüpfung</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(val) => {
                      if (val === "none") {
                        field.onChange(undefined);
                        form.setValue("setupLabel", "");
                        return;
                      }
                      field.onChange(val);
                      const s = setups.find(
                        (st) => st._id && String(st._id) === val
                      );
                      if (s) {
                        form.setValue("setupLabel", s.setupLabel ?? "");
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Setup wählen (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        Kein Setup verknüpft
                      </SelectItem>
                      {setups.map((s) => (
                        <SelectItem
                          key={s._id ?? s.setupLabel ?? s.market}
                          value={String(s._id)}
                        >
                          {s.setupLabel ?? "Setup"}{" "}
                          {s.market ? `· ${s.market}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. FTMO Swing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* SECTION 2 – ICC Setup */}
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
              onClick={() => setShowPlaybook((v) => !v)}
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
                        <SelectItem value="">Kein Template</SelectItem>
                        {ICC_TEMPLATES.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Verknüpft den Trade mit einem ICC-Template (z. B.
                      „ICC Basic“) für spätere Auswertungen.
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
                          <SelectItem value="continuation">
                            Continuation
                          </SelectItem>
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

          {/* Playbook eingeblendet (optional) */}
          {showPlaybook && (
            <div className="mt-3">
              <IccPlaybook
                selectedTemplateId={
                  selectedTemplate ? selectedTemplate : null
                }
                onSelectTemplate={(tplId) => {
                  form.setValue("iccPlaybookTemplateId", tplId);
                }}
              />
            </div>
          )}
        </div>

        {/* SECTION 3 – Gruppe / Strategie */}
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">
              Strategie / Gruppe (TradeZella-Style)
            </h3>
            {selectedGroupId && (
              <Badge variant="secondary" className="text-[10px]">
                {form.watch("groupName")}
              </Badge>
            )}
          </div>

          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gruppe / Strategie</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(val) =>
                    field.onChange(val === "none" ? undefined : val)
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Gruppe wählen (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Ohne Gruppe</SelectItem>
                    {activeGroups.map((g) => (
                      <SelectItem key={g._id ?? g.name} value={g._id!}>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: g.color ?? "#5227ff",
                            }}
                          />
                          <span>{g.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Gruppen verwaltest du im Tab &quot;Strategien&quot; im
                  Trading-Dashboard.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* SECTION 4 – Trade-Parameter */}
        <div className="space-y-4 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">Trade-Parameter</h3>

          <div className="grid gap-4 md:grid-cols-4">
            <FormField
              control={form.control}
              name="entry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry</FormLabel>
                  <FormControl>
                    <Input placeholder="Entry-Preis" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exit</FormLabel>
                  <FormControl>
                    <Input placeholder="Exit-Preis" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stopLoss"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stop Loss</FormLabel>
                  <FormControl>
                    <Input placeholder="SL" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="positionSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position Size</FormLabel>
                  <FormControl>
                    <Input placeholder="Lots / Risiko €" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result</FormLabel>
                  <Select
                    value={field.value ?? "BE"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Result" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="win">Win</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                      <SelectItem value="BE">BE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pnl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PnL</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. 250.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating (1–10)</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. 7" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* SECTION 5 – ICC Checklist & Risk Engine */}
        <div className="space-y-4 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">ICC Checklist & Risiko</h3>

          {isICC && (
            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="iccChecklistPriceAt4h"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      Price an 4H-Indication / Level?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklist1HFollowsTrend"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      1H respektiert HTF-Trend (HL/LH)?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklistBosSwing"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      BOS vom relevanten Swing?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklistTfCorrelation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      Timeframe-Korrelation passt (4H/1H/LTF)?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklistEntryImpulseZone"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      Entry aus Ursprungs-Impulse-Zone?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklistSessionTime"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      London / NY &amp; 6–11 Uhr?
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iccChecklistTargetOppositeSide"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 md:col-span-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="text-xs">
                      Target = Gegenseite (Buys zu Sellers / Sells zu Buyers)?
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="accountType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account-Typ</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Funded / Privat" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="funded">Funded</SelectItem>
                      <SelectItem value="private">Privat</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="riskPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risiko %</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. 1.5" {...field} />
                  </FormControl>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Funded: 1.5 % · Privat: 5 % max (ICC-Plan).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="plannedRR"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geplanter RR</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. 3 (für 3R)" {...field} />
                  </FormControl>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ICC-Ziel: mindestens 2–4R.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* SECTION 6 – Meta, Management, Tags, Psych, Replay */}
        <div className="space-y-4 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">Meta, Management & Journal</h3>

          <FormField
            control={form.control}
            name="iccReviewNeeded"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(!!v)}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>In ICC-Review-Queue aufnehmen</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Markiere diesen Trade für dein abendliches Replay / Deep
                    Review.
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
                  <Input
                    placeholder="https://tradingview.com/... (vor Entry)"
                    {...field}
                  />
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
                  <Input
                    placeholder="https://tradingview.com/... (nach Trade)"
                    {...field}
                  />
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
                  <Select
                    value={field.value ?? "planned"}
                    onValueChange={field.onChange}
                  >
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
                    <Input
                      placeholder="z.B. 4H Indication, 1H HL, LTF BOS"
                      {...field}
                    />
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
                    <Input
                      placeholder="z.B. london, news, breakout"
                      {...field}
                    />
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
            <FormField
              control={form.control}
              name="managementMarkedHighsLows"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs">
                    Lows/Highs im LTF markiert?
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managementTookPartialsAtTp1"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs">
                    Partials bei TP1 genommen?
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managementClosedOnTrendChange"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs">
                    Restposition bei Trendwechsel geschlossen?
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managementHomeTradeUntilSessionEnd"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(!!v)}
                    />
                  </FormControl>
                  <FormLabel className="text-xs">
                    Home Trade bis Session-Ende gehalten?
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Psych + State */}
          <div className="grid gap-4 md:grid-cols-3">
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

            {/* neu: State-Tag */}
            <FormField
              control={form.control}
              name="iccStateTag"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State (innerer Zustand)</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(val) =>
                      field.onChange(val === "" ? "" : (val as IccStateTag))
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="State wählen (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Kein State-Tag</SelectItem>
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
            name="psychComment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Psych-Notiz</FormLabel>
                <FormControl>
                  <Textarea
                    rows={2}
                    placeholder="FOMO? Revenge? Wie hast du dich gefühlt?"
                    {...field}
                  />
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
                  <Textarea
                    rows={2}
                    placeholder="z.B. außerhalb Session, RR &lt; 2R, gegen Trend..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Bestehende Gedanken / Notes */}
          <FormField
            control={form.control}
            name="thoughts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gedanken (kurz)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Emotion, Fokus, Fehler – kurz festhalten"
                    {...field}
                  />
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
                  <Textarea
                    rows={2}
                    placeholder="Welche Regeln wurden verletzt? Warum?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notizen</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Weitere Details zum Trade..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isEdit ? "Trade aktualisieren" : "Trade speichern"}
        </Button>
      </form>
    </Form>
  );
};

export default TradeEntryForm;
