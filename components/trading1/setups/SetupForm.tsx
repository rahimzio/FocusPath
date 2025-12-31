// components/trading1/setup/SetupForm.tsx
import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWRMutation from "swr/mutation";

import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import {
  setupFormSchema,
  SetupFormValues,
} from "../../../pages/api/trading/setups/setup-form-schema";
import {
  SetupBasicSection,
  SetupStructureSection,
  SetupPlanSection,
  SetupChecklistSection,
  SetupStatusSection,
} from "./SetupFormSections";
import { SetupChecklistState, TradingSetup } from "../interface";

// 🔹 NEU: Stepper
import Stepper, { Step } from "./Stepper";
import { createSetup, updateSetup } from "@/pages/api/trading/setups/setup-api";
import { DEFAULT_ENTRY_CHECKLIST } from "@/pages/api/trading/setups/setup-checklist";

interface SetupFormProps {
  userId: string;
  initialData?: TradingSetup;
  mode?: "create" | "edit";
  onSuccess?: (setup: TradingSetup) => void;
  className?: string;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  userId,
  initialData,
  mode = "create",
  onSuccess,
  className,
}) => {
  const isEdit = mode === "edit" && !!initialData?._id;

  const defaultChecklistState: Record<string, boolean> = React.useMemo(() => {
    if (!initialData?.entryChecklistState?.length) return {};
    const map: Record<string, boolean> = {};
    initialData.entryChecklistState.forEach((item) => {
      map[item.itemId] = !!item.checked;
    });
    return map;
  }, [initialData]);

  const defaultValues: SetupFormValues = {
    market: initialData?.market ?? "",
    direction: initialData?.direction ?? "long",

    // Legacy-Felder (können später entfernt werden, tun aber nicht weh)
    htfTf: initialData?.htfTf ?? "H4",
    htfBias: initialData?.htfBias ?? "bullish",
    entryTf: initialData?.entryTf ?? "M15",

    // Chart
    chartImageUrl: initialData?.chartImageUrl ?? "",

    // Setup-Charakteristik
    setupLabel: initialData?.setupLabel ?? "",
    patternType: initialData?.patternType ?? "",
    keyLevels: initialData?.keyLevels ?? [],
    structureNotes: initialData?.structureNotes ?? "",

    // numerische Felder als String im Form
    plannedEntryMin:
      initialData?.plannedEntryMin !== undefined
        ? String(initialData.plannedEntryMin)
        : "",
    plannedEntryMax:
      initialData?.plannedEntryMax !== undefined
        ? String(initialData.plannedEntryMax)
        : "",
    plannedStop:
      initialData?.plannedStop !== undefined
        ? String(initialData.plannedStop)
        : "",
    plannedTarget:
      initialData?.plannedTarget !== undefined
        ? String(initialData.plannedTarget)
        : "",
    plannedRR:
      initialData?.plannedRR !== undefined
        ? String(initialData.plannedRR)
        : "",

    status: initialData?.status ?? "open",
    thoughtProcess: initialData?.thoughtProcess ?? "",
    decision: initialData?.decision,
    outcome: initialData?.outcome,
    gameGrade: initialData?.gameGrade,
    reflection: initialData?.reflection ?? "",
    checklistState: defaultChecklistState,
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

  const toNumberOrUndefined = (v?: string) =>
    v && v.trim() !== "" ? Number(v) : undefined;

  const handleSubmitForm = form.handleSubmit(async (values) => {
    const checklistState: SetupChecklistState[] = DEFAULT_ENTRY_CHECKLIST.map(
      (item) => ({
        itemId: item.id,
        checked: !!values.checklistState?.[item.id],
      })
    );

    const payload = {
      userId,
      market: values.market,
      direction: values.direction,
      htfTf: values.htfTf,
      htfBias: values.htfBias,
      entryTf: values.entryTf,

      chartImageUrl: values.chartImageUrl || undefined,

      setupLabel: values.setupLabel,
      patternType: values.patternType,
      keyLevels: values.keyLevels,
      structureNotes: values.structureNotes,
      plannedEntryMin: toNumberOrUndefined(values.plannedEntryMin),
      plannedEntryMax: toNumberOrUndefined(values.plannedEntryMax),
      plannedStop: toNumberOrUndefined(values.plannedStop),
      plannedTarget: toNumberOrUndefined(values.plannedTarget),
      plannedRR: toNumberOrUndefined(values.plannedRR),
      status: values.status,
      thoughtProcess: values.thoughtProcess,
      decision: values.decision,
      outcome: values.outcome,
      gameGrade: values.gameGrade,
      reflection: values.reflection,
      entryChecklistTemplate: DEFAULT_ENTRY_CHECKLIST,
      entryChecklistState: checklistState,
    };

    try {
      let setup: TradingSetup;

      if (isEdit) {
        setup = await triggerUpdate(payload);
      } else {
        setup = await triggerCreate(payload);
        form.reset();
      }

      onSuccess?.(setup);
    } catch (err) {
      console.error("Error submitting setup form", err);
    }
  });

  const status = form.watch("status");

  return (
    <Form {...form}>
      {/* Wir nutzen Stepper für Navigation, daher verhindern wir das native Submit */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className={cn("space-y-6", className)}
      >
        <Stepper
          initialStep={1}
          onStepChange={() => {}}
          onFinalStepCompleted={() => handleSubmitForm()}
          backButtonText="Zurück"
          nextButtonText="Weiter"
          finalButtonText={isEdit ? "Setup aktualisieren" : "Setup speichern"}
        >
          {/* Step 1 – Basis & Kontext */}
          <Step>
            <SetupBasicSection form={form} isEdit={isEdit} />
          </Step>

          {/* Step 2 – Setup & Struktur */}
          <Step>
            <SetupStructureSection form={form} />
          </Step>

          {/* Step 3 – Plan */}
          <Step>
            <SetupPlanSection form={form} />
          </Step>

          {/* Step 4 – Checkliste + Status & Gedanken */}
          <Step>
            <div className="space-y-4">
              <SetupChecklistSection form={form} />
              <SetupStatusSection form={form} status={status as string} />
              <p className="pt-2 text-right text-[11px] text-muted-foreground">
                Beim Klick auf „{isEdit ? "Setup aktualisieren" : "Setup speichern"}“
                wird dein Setup gespeichert.
              </p>
            </div>
          </Step>
        </Stepper>
      </form>
    </Form>
  );
};

export default SetupForm;
