// components/trading1/trades/TradeEntryForm.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import useSWR from "swr";
import useSWRMutation from "swr/mutation";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import type { TradeEntry, TradeGroup, TradingSetup } from "../interface";
import type {
  TradeEntryFormProps,
  TradeEntryFormValues,
} from "./TradeEntryForm.types";

import TradeBaseSection from "./sections/TradeBaseSection";
import StrategyGroupSection from "./sections/StrategyGroupSection";
import TradeParametersSection from "./sections/TradeParametersSection";
import IccChecklistRiskSection from "./sections/IccChecklistRiskSection";
import MetaManagementJournalSection from "./sections/MetaManagementJournalSection";
import { IccSetupSection } from "./sections/IccSetupSection";
import GamePicker from "../GamePicker";

// ✅ локaler Typ (damit es bei dir nicht crasht, auch wenn du TradingAccount noch nicht im interface hast)
type TradingAccountLite = {
  _id?: string;
  name: string;
  currency?: string;
};

// ---------------- Helpers + API (unverändert) ----------------
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

const toNumberOrUndefined = (v?: string) =>
  v && v.trim() !== "" ? Number(v) : undefined;

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

// ---------------- Haupt-Komponente ----------------
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

  // Setups laden
  const { data: setupsData } = useSWR(
    userId ? `/api/trading/setups/list?userId=${userId}` : null,
    fetcher
  );
  const setups: TradingSetup[] = setupsData?.setups ?? [];

  // ✅ Accounts laden (NEU)
  const { data: accountsData, error: accountsError } = useSWR(
    userId ? `/api/trading/accounts/list?userId=${userId}` : null,
    fetcher
  );
  const accounts: TradingAccountLite[] = accountsData?.accounts ?? [];

  // ✅ AccountId State (NEU) – im Edit-Mode vorbefüllen
  const [accountId, setAccountId] = React.useState<string>(
    String((initialData as any)?.accountId ?? "none")
  );

  React.useEffect(() => {
    setAccountId(String((initialData as any)?.accountId ?? "none"));
  }, [isEdit, initialData]);

  // ---- defaultValues ----
  const defaultValues = {
    setupSelectedIds: ((initialData as any)?.setupSelectedIds ?? []) as any,
    optional: ((initialData as any)?.optional ?? false) as any,
    setupGameGrade: ((initialData as any)?.setupGameGrade ?? "C") as any,
    setupAvgPoints: ((initialData as any)?.setupAvgPoints ?? 0) as any,

    date: initialData?.date ?? new Date().toISOString().slice(0, 10),
    symbol: initialData?.symbol ?? "",
    setupLabel: initialData?.setupLabel ?? "",
    setupId: (initialData as any)?.setupId ?? undefined,
    groupId: (initialData as any)?.groupId ?? undefined,
    groupName: initialData?.groupName ?? "",
    entry: initialData?.entry !== undefined ? String(initialData.entry) : "",
    exit: initialData?.exit !== undefined ? String(initialData.exit) : "",
    stopLoss:
      (initialData as any)?.stopLoss !== undefined
        ? String((initialData as any).stopLoss)
        : "",
    positionSize:
      (initialData as any)?.positionSize !== undefined
        ? String((initialData as any).positionSize)
        : "",
    result: (initialData?.result as any) ?? "BE",
    pnl: (initialData as any)?.pnl !== undefined ? String((initialData as any).pnl) : "",
    rating:
      (initialData as any)?.rating !== undefined
        ? String((initialData as any).rating)
        : "5",
    screenshotUrl: (initialData as any)?.screenshotUrl ?? "",
    notes: initialData?.notes ?? "",
    tags: (initialData as any)?.tags?.join(", ") ?? "",
    session: (initialData as any)?.session ?? "other",

    // ✅ wird vom Account Select gesetzt (Name bleibt kompatibel mit deinem bisherigen Modell)
    accountName: (initialData as any)?.accountName ?? "",

    gameGrade: (initialData as any)?.gameGrade ?? undefined,
    thoughts: (initialData as any)?.thoughts ?? "",
    ruleBreak: (initialData as any)?.ruleBreak ?? false,
    ruleBreakNotes: (initialData as any)?.ruleBreakNotes ?? "",
    isICC: (initialData as any)?.isICC ?? true,
    iccTrendHTF: (initialData as any)?.iccTrendHTF ?? "",
    iccTrendPart: (initialData as any)?.iccTrendPart ?? "",
    iccFourHStatus: (initialData as any)?.iccFourHStatus ?? "",
    iccOneHStructure: (initialData as any)?.iccOneHStructure ?? "",
    iccTimeframeCombo: (initialData as any)?.iccTimeframeCombo ?? "",
    iccChecklistPriceAt4h: (initialData as any)?.iccChecklistPriceAt4h ?? false,
    iccChecklist1HFollowsTrend:
      (initialData as any)?.iccChecklist1HFollowsTrend ?? false,
    iccChecklistBosSwing: (initialData as any)?.iccChecklistBosSwing ?? false,
    iccChecklistTfCorrelation:
      (initialData as any)?.iccChecklistTfCorrelation ?? false,
    iccChecklistEntryImpulseZone:
      (initialData as any)?.iccChecklistEntryImpulseZone ?? false,
    iccChecklistSessionTime: (initialData as any)?.iccChecklistSessionTime ?? false,
    iccChecklistTargetOppositeSide:
      (initialData as any)?.iccChecklistTargetOppositeSide ?? false,
    iccPlaybookTemplateId: (initialData as any)?.iccPlaybookTemplateId ?? "",
    accountType: (initialData as any)?.accountType ?? "",
    riskPercent:
      (initialData as any)?.riskPercent !== undefined
        ? String((initialData as any).riskPercent)
        : "",
    plannedRR:
      (initialData as any)?.plannedRR !== undefined
        ? String((initialData as any).plannedRR)
        : "",
    managementStatus: (initialData as any)?.managementStatus ?? "planned",
    managementMarkedHighsLows:
      (initialData as any)?.managementMarkedHighsLows ?? false,
    managementTookPartialsAtTp1:
      (initialData as any)?.managementTookPartialsAtTp1 ?? false,
    managementClosedOnTrendChange:
      (initialData as any)?.managementClosedOnTrendChange ?? false,
    managementHomeTradeUntilSessionEnd:
      (initialData as any)?.managementHomeTradeUntilSessionEnd ?? false,
    iccTags: (initialData as any)?.iccTags?.join(", ") ?? "",
    psychReason: (initialData as any)?.psychReason ?? "",
    psychComment: (initialData as any)?.psychComment ?? "",
    violatedIccRules: (initialData as any)?.violatedIccRules ?? false,
    violatedRulesNotes: (initialData as any)?.violatedRulesNotes ?? "",
    iccStateTag: (initialData as any)?.iccStateTag ?? "",
    preScreenshotUrl: (initialData as any)?.preScreenshotUrl ?? "",
    postScreenshotUrl: (initialData as any)?.postScreenshotUrl ?? "",
    iccReviewNeeded: (initialData as any)?.iccReviewNeeded ?? false,
    iccReviewNotes: (initialData as any)?.iccReviewNotes ?? "",
  } as unknown as TradeEntryFormValues;

  const form = useForm<TradeEntryFormValues>({
    defaultValues: { ...defaultValues, ...initialFormValues },
  });

  // ✅ Wenn Account gewählt wird: accountName im Form mitschreiben
  React.useEffect(() => {
    if (!accounts?.length) return;

    // none => clear
    if (!accountId || accountId === "none") {
      form.setValue("accountName", "", { shouldDirty: true });
      return;
    }

    const acc = accounts.find((a) => String(a._id) === String(accountId));
    if (!acc) return;

    form.setValue("accountName", acc.name, { shouldDirty: true });
  }, [accountId, accounts, form]);

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

  const selectedGroupId = form.watch("groupId");
  const isICC = form.watch("isICC");
  const selectedTemplate = form.watch("iccPlaybookTemplateId") as any;

  const [showPlaybook, setShowPlaybook] = React.useState(false);

  // ✅ GamePicker State (Trade)
  const [tradeSelectedIds, setTradeSelectedIds] = React.useState<string[]>([]);
  const [tradeGameGrade, setTradeGameGrade] = React.useState<
    "S" | "A" | "B" | "C"
  >("C");
  const [tradeAvgPoints, setTradeAvgPoints] = React.useState<number>(0);

  // ✅ Init im Edit-Mode (falls Trade diese Felder schon gespeichert hat)
  React.useEffect(() => {
    if (!isEdit || !initialData) return;

    const ids = ((initialData as any).tradeSelectedIds ?? []) as string[];
    const grade = ((((initialData as any).tradeGameGrade as any) ?? "C") as
      | "S"
      | "A"
      | "B"
      | "C");
    const avg = Number((initialData as any).tradeAvgPoints ?? 0);

    setTradeSelectedIds(Array.isArray(ids) ? ids.map(String) : []);
    setTradeGameGrade(grade);
    setTradeAvgPoints(Number.isFinite(avg) ? avg : 0);
  }, [isEdit, initialData]);

  React.useEffect(() => {
    if (!selectedGroupId) {
      form.setValue("groupName", "");
      return;
    }
    const g = activeGroups.find((gr) => gr._id === selectedGroupId);
    if (g) form.setValue("groupName", g.name);
  }, [selectedGroupId, activeGroups, form]);

  // ---- Submit (Payload ergänzt um Account + GamePicker Werte) ----
  const handleSubmitForm = form.handleSubmit(async (values) => {
    const tags =
      values.tags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];
    const iccTags =
      values.iccTags?.split(",").map((t) => t.trim()).filter(Boolean) ?? [];

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
      iccPlaybookTemplateId: values.iccPlaybookTemplateId || undefined,
      iccStateTag: values.iccStateTag || undefined,

      // ✅ NEW: Account-Quelle speichern (optional)
      accountId: accountId === "none" ? undefined : accountId,

      // ✅ NEW: persist Trade-Game Auswahl
      tradeSelectedIds,
      tradeGameGrade,
      tradeAvgPoints,
    };

    try {
      let trade: TradeEntry;

      if (isEdit) {
        trade = await triggerUpdate({ payload: payloadForApi });
      } else {
        trade = await triggerCreate({ userId, payload: payloadForApi });

        form.reset({ ...defaultValues, ...initialFormValues });

        // ✅ reset GamePicker UI bei create
        setTradeSelectedIds([]);
        setTradeGameGrade("C");
        setTradeAvgPoints(0);

        // ✅ reset Account Auswahl bei create
        setAccountId("none");
      }

      onSuccess?.(trade);
    } catch (err) {
      console.error("Error submitting trade form", err);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmitForm} className={cn("space-y-6", className)}>
        <TradeBaseSection form={form} isEdit={isEdit} setups={setups} />

        {/* ✅ NEW: Account Select (optional) */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Account</p>
            <p className="text-xs text-muted-foreground">(optional)</p>
          </div>

          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Account auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Kein Account</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={String(acc._id ?? acc.name)} value={String(acc._id)}>
                  {acc.name}
                  {acc.currency ? ` (${acc.currency})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {accountsError && (
            <p className="text-[11px] text-muted-foreground">
              Accounts konnten nicht geladen werden.
            </p>
          )}
          {!accountsError && accounts.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              Noch keine Accounts angelegt.
            </p>
          )}
        </Card>

        {/* ✅ FIX: Props passend zu IccSetupSectionProps */}
        <IccSetupSection
          form={form}
          isICC={isICC}
          showPlaybook={showPlaybook}
          onTogglePlaybook={() => setShowPlaybook((prev) => !prev)}
          selectedTemplate={selectedTemplate}
        />

        <StrategyGroupSection
          form={form}
          activeGroups={activeGroups}
          selectedGroupId={selectedGroupId}
        />

        <TradeParametersSection form={form} />

        <IccChecklistRiskSection form={form} isICC={isICC} />

        <MetaManagementJournalSection form={form} />

        {/* ✅ Trade Game Picker */}
        <GamePicker
          userId={userId}
          scope="trade"
          value={tradeSelectedIds}
          onChange={({ selectedIds, grade, avgPoints }) => {
            setTradeSelectedIds(selectedIds);
            setTradeGameGrade(grade);
            setTradeAvgPoints(avgPoints);
          }}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isEdit ? "Trade aktualisieren" : "Trade speichern"}
        </Button>
      </form>
    </Form>
  );
};

export default TradeEntryForm;
