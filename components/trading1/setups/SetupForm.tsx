// components/trading1/setup/SetupForm.tsx
"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWRMutation from "swr/mutation";

import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";


import {
  SetupBasicSection,
  SetupStructureSection,
  SetupPlanSection,
  SetupChecklistSection,
  SetupStatusSection,
} from "./SetupFormSections";

import { SetupChecklistState, TradingSetup } from "../interface";

// 🔹 Stepper
import Stepper, { Step } from "./Stepper";
import { createSetup, updateSetup } from "@/pages/api/trading/setups/setup-api";
import { setupFormSchema, SetupFormValues } from "@/pages/api/trading/setups/setup-form-schema";

interface SetupFormProps {
  userId: string;
  initialData?: TradingSetup;
  mode?: "create" | "edit";
  onSuccess?: (setup: TradingSetup) => void;
  className?: string;
}

function toNumberOrUndefined(v?: string) {
  if (!v) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  userId,
  initialData,
  mode = "create",
  onSuccess,
  className,
}) => {
  const isEdit = mode === "edit" && !!initialData?._id;

  // ✅ map existing entryChecklistState -> checklistState map for preview
  const defaultChecklistState: Record<string, boolean> = React.useMemo(() => {
    if (!initialData?.entryChecklistState?.length) return {};
    const map: Record<string, boolean> = {};
    initialData.entryChecklistState.forEach((item) => {
      map[item.itemId] = !!item.checked;
    });
    return map;
  }, [initialData]);

  // ✅ IMPORTANT: use user template from initialData OR [] (NO DEFAULT)
  const defaultEntryTemplate = React.useMemo(() => {
    const t = (initialData as any)?.entryChecklistTemplate;
    return Array.isArray(t) ? t : [];
  }, [initialData]);

  // ✅ PlannedTargets default from initialData OR []
  const defaultPlannedTargets = React.useMemo(() => {
    const pt = (initialData as any)?.plannedTargets;
    if (!Array.isArray(pt)) return [];
    return pt.map((x: any) => ({
      id: String(x?.id ?? ""),
      type: x?.type,
      price: x?.price != null ? String(x.price) : "",
      label: x?.label ?? "",
      side: x?.side,
    }));
  }, [initialData]);

  const defaultValues: SetupFormValues = {
    // ✅ NEW REQUIRED
    tradeType: (initialData as any)?.tradeType ?? "daytrade",

    market: initialData?.market ?? "",
    direction: initialData?.direction ?? "long",

    // Legacy
    htfTf: initialData?.htfTf ?? "H4",
    htfBias: initialData?.htfBias ?? "bullish",
    entryTf: (initialData as any)?.entryTf ?? "M15",

    chartImageUrl: initialData?.chartImageUrl ?? "",

    setupLabel: initialData?.setupLabel ?? "",
    patternType: initialData?.patternType ?? "",
    keyLevels: initialData?.keyLevels ?? [],
    structureNotes: initialData?.structureNotes ?? "",

    plannedEntryMin:
      initialData?.plannedEntryMin !== undefined ? String(initialData.plannedEntryMin) : "",
    plannedEntryMax:
      initialData?.plannedEntryMax !== undefined ? String(initialData.plannedEntryMax) : "",
    plannedStop:
      initialData?.plannedStop !== undefined ? String(initialData.plannedStop) : "",

    // legacy
    plannedTarget:
      (initialData as any)?.plannedTarget !== undefined ? String((initialData as any).plannedTarget) : "",

    plannedRR:
      initialData?.plannedRR !== undefined ? String(initialData.plannedRR) : "",

    // ✅ NEW optional
    actualRR:
      (initialData as any)?.actualRR !== undefined ? String((initialData as any).actualRR) : "",

    // ✅ NEW
    plannedTargets: defaultPlannedTargets as any,

    status: initialData?.status ?? "open",
    thoughtProcess: initialData?.thoughtProcess ?? "",
    decision: initialData?.decision,
    outcome: initialData?.outcome,
    gameGrade: initialData?.gameGrade,
    reflection: initialData?.reflection ?? "",

    // ✅ preview checkbox map
    checklistState: defaultChecklistState,

    // ✅ user-defined template array
    entryChecklistTemplate: defaultEntryTemplate as any,
  };

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema) as Resolver<SetupFormValues>,
    defaultValues,
  });

  const { trigger: triggerCreate, isMutating: creating } = useSWRMutation(
    "/api/trading/setups/create",
    createSetup
  );

  const { trigger: triggerUpdate, isMutating: updating } = useSWRMutation(
    () => (isEdit ? `/api/trading/setups/${initialData!._id}` : null),
    updateSetup
  );

  const isSubmitting = form.formState.isSubmitting || creating || updating;

  const handleSubmitForm = form.handleSubmit(async (values) => {
    // ✅ Use ONLY user-created template
    const userTemplate = Array.isArray((values as any).entryChecklistTemplate)
      ? ((values as any).entryChecklistTemplate as any[])
      : [];

    // ✅ Build state ONLY from userTemplate
    const checklistStateArr: SetupChecklistState[] = userTemplate
      .map((item) => {
        const id = String(item?.id ?? "").trim();
        if (!id) return null;

        return {
          itemId: id,
          checked: !!(values as any).checklistState?.[id],
        } as SetupChecklistState;
      })
      .filter(Boolean) as SetupChecklistState[];

    // ✅ plannedTargets: strings -> numbers (price optional)
    const plannedTargets = Array.isArray((values as any).plannedTargets)
      ? (values as any).plannedTargets
          .map((t: any) => {
            const id = String(t?.id ?? "").trim();
            const type = t?.type;
            if (!id || !type) return null;

            return {
              id,
              type,
              price: toNumberOrUndefined(t?.price),
              label: t?.label ? String(t.label) : undefined,
              side: t?.side ? String(t.side) : undefined,
            };
          })
          .filter(Boolean)
      : [];

    const payload: any = {
      userId,

      // ✅ NEW REQUIRED
      tradeType: values.tradeType,

      market: values.market,
      direction: values.direction,
      htfTf: values.htfTf,
      htfBias: values.htfBias,
      entryTf: values.entryTf,

      chartImageUrl: values.chartImageUrl || undefined,

      setupLabel: values.setupLabel || undefined,
      patternType: values.patternType,
      keyLevels: values.keyLevels,
      structureNotes: values.structureNotes || undefined,

      plannedEntryMin: toNumberOrUndefined(values.plannedEntryMin),
      plannedEntryMax: toNumberOrUndefined(values.plannedEntryMax),

      // optional
      plannedStop: toNumberOrUndefined(values.plannedStop),

      // legacy
      plannedTarget: toNumberOrUndefined((values as any).plannedTarget),

      plannedRR: toNumberOrUndefined(values.plannedRR),

      // ✅ NEW
      actualRR: toNumberOrUndefined((values as any).actualRR),
      plannedTargets,

      status: values.status,
      thoughtProcess: values.thoughtProcess || undefined,
      decision: values.decision,
      outcome: values.outcome,
      gameGrade: values.gameGrade,
      reflection: values.reflection || undefined,

      // ✅ IMPORTANT: if user created nothing => []
      entryChecklistTemplate: userTemplate,
      entryChecklistState: userTemplate.length ? checklistStateArr : [],
    };

    // ✅ easy-to-read submit debug
    console.log("============== [SetupForm.submit] ==============");
    console.log("[submit] tradeType:", values.tradeType);
    console.log("[submit] templateCount:", userTemplate.length);
    console.log("[submit] templatePreview:", userTemplate.slice(0, 3));
    console.log("[submit] stateCount:", (payload.entryChecklistState as any[]).length);
    console.log("[submit] statePreview:", (payload.entryChecklistState as any[]).slice(0, 3));
    console.log("[submit] plannedTargetsCount:", plannedTargets.length);
    console.log("[submit] plannedTargetsPreview:", plannedTargets.slice(0, 3));
    console.log("[submit] actualRR:", payload.actualRR);
    console.log("===============================================");

    try {
      let setup: TradingSetup;

      if (isEdit) {
        setup = await triggerUpdate(payload) as TradingSetup;
      } else {
        setup = await triggerCreate(payload) as TradingSetup;

        // reset to clean slate, especially template/state
        form.reset({
          ...defaultValues,
          market: "",
          setupLabel: "",
          patternType: "",
          structureNotes: "",
          plannedEntryMin: "",
          plannedEntryMax: "",
          plannedStop: "",
          plannedRR: "",
          actualRR: "",
          plannedTargets: [] as any,
          checklistState: {},
          entryChecklistTemplate: [] as any,
        });
      }

      onSuccess?.(setup);
    } catch (err) {
      console.error("Error submitting setup form", err);
    }
  });

  const status = form.watch("status");

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className={cn("space-y-6", className)}>
        <Stepper
          initialStep={1}
          onStepChange={() => {}}
          onFinalStepCompleted={() => handleSubmitForm()}
          backButtonText="Zurück"
          nextButtonText="Weiter"
          finalButtonText={isEdit ? "Setup aktualisieren" : "Setup speichern"}
        >
          <Step>
            <SetupBasicSection form={form} isEdit={isEdit} />
          </Step>

          <Step>
            <SetupStructureSection form={form} />
          </Step>

          <Step>
            <SetupPlanSection form={form} />
          </Step>

          <Step>
            <div className="space-y-4">
              <SetupChecklistSection form={form} />
              <SetupStatusSection form={form} status={status as string} />

              <p className="pt-2 text-right text-[11px] text-muted-foreground">
                Beim Klick auf „{isEdit ? "Setup aktualisieren" : "Setup speichern"}“ wird dein Setup gespeichert.
              </p>

              <Button
                type="button"
                className="w-full"
                disabled={isSubmitting}
                onClick={() => handleSubmitForm()}
              >
                {isEdit ? "Setup aktualisieren" : "Setup speichern"}
              </Button>
            </div>
          </Step>
        </Stepper>
      </form>
    </Form>
  );
};

export default SetupForm;
