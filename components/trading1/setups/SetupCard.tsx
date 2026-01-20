"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TradingSetup } from "../interface";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface SetupCardProps {
  setup: TradingSetup;
  onEdit: (setup: TradingSetup) => void;
  onOpenDetail?: (setup: TradingSetup) => void;
  compact?: boolean;
  userId?: string;
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

const gameGradeStyleMap: Record<string, { label: string; className: string }> = {
  A: { label: "A-Game", className: "border-emerald-500 text-emerald-600" },
  B: { label: "B-Game", className: "border-amber-500 text-amber-600" },
  C: { label: "C-Game", className: "border-red-500 text-red-600" },
};

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
  // ✅ FULL payload log BEFORE sending
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

const SetupCard: React.FC<SetupCardProps> = ({
  setup,
  onEdit,
  onOpenDetail,
  compact,
  userId,
}) => {
  const statusVariant = statusVariantMap[setup.status] ?? "outline";

  const created = setup.createdAt
    ? new Date(setup.createdAt as string).toLocaleDateString()
    : undefined;

  const gameGradeConfig = setup.gameGrade ? gameGradeStyleMap[setup.gameGrade] : undefined;

  const effectiveUserId = userId ?? (setup.userId as string) ?? "";

  const template = setup.entryChecklistTemplate ?? [];

  const initialState = React.useMemo<ChecklistState[]>(
    () => (Array.isArray(setup.entryChecklistState) ? (setup.entryChecklistState as any) : []),
    [setup.entryChecklistState]
  );

  const [localState, setLocalState] = React.useState<ChecklistState[]>(initialState);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalState(initialState);
  }, [initialState, setup._id]);

  const totalItems = template.length;

  const checkedCount = React.useMemo(() => {
    const map = new Map(localState.map((x) => [x.itemId, !!x.checked]));
    return template.filter((it) => map.get(it.id)).length;
  }, [localState, template]);

  const progressLabel = totalItems > 0 ? `${checkedCount}/${totalItems} erfüllt` : undefined;

  function isItemChecked(id: string) {
    return !!localState.find((x) => x.itemId === id)?.checked;
  }

  async function toggleItem(itemId: string, checked: boolean) {
    const now = new Date().toISOString();

    const next: ChecklistState[] = (() => {
      const existing = localState.find((x) => x.itemId === itemId);
      if (existing) {
        return localState.map((x) =>
          x.itemId === itemId ? { ...x, checked, checkedAt: checked ? now : x.checkedAt } : x
        );
      }
      return [...localState, { itemId, checked, checkedAt: checked ? now : undefined }];
    })();

    setLocalState(next);

    // ✅ log payload inputs
    console.log("[SetupCard.toggleItem] will patch with:", {
      userId: effectiveUserId,
      setupIdRaw: setup._id,
      setupIdStr: String(setup._id),
      changedItemId: itemId,
      changedChecked: checked,
      nextItems: next.length,
      nextPreview: previewChecklist(next),
    });

    if (!effectiveUserId || !setup._id) return;

    try {
      setSaving(true);
      await patchChecklist({
        userId: effectiveUserId,
        setupId: String(setup._id),
        entryChecklistState: next,
      });
    } catch (e) {
      setLocalState(localState);
      console.error("Checklist update failed:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      className={cn(
        "flex flex-col justify-between cursor-pointer hover:bg-muted/50 transition",
        compact && "opacity-80"
      )}
      onClick={() => onOpenDetail?.(setup)}
    >
      {setup.chartImageUrl && (
        <div className="relative h-24 w-full overflow-hidden rounded-t-xl border-b bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={setup.chartImageUrl}
            alt={setup.setupLabel ?? setup.market}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight line-clamp-1">
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
          <span>{setup.market}</span>
          {setup.direction && (
            <span className={cn("font-medium", directionColorMap[setup.direction] ?? "")}>
              {setup.direction.toUpperCase()}
            </span>
          )}
          {setup.htfTf && <span>HTF: {setup.htfTf}</span>}
          {setup.entryTf && <span>Entry: {setup.entryTf}</span>}
        </div>

        {setup.patternType && <p className="text-xs text-muted-foreground">{setup.patternType}</p>}
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-4">
        {setup.thoughtProcess && !compact && (
          <p className="line-clamp-3 text-xs text-muted-foreground">{setup.thoughtProcess}</p>
        )}

        {!compact && template.length > 0 && (
          <div className="mt-1 space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Entry-Checkliste {saving ? "· speichert…" : ""}
            </p>

            <div className="space-y-1">
              {template.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-md border px-2 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isItemChecked(item.id)}
                    onCheckedChange={(v) => toggleItem(item.id, !!v)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{item.label}</span>
                      {item.required && (
                        <Badge variant="outline" className="text-[10px]">
                          Pflicht
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}

              {template.length > 4 && (
                <p className="text-[11px] text-muted-foreground">
                  + {template.length - 4} weitere Punkte (öffne Details)
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {gameGradeConfig && (
              <Badge variant="outline" className={cn("text-[10px] font-semibold", gameGradeConfig.className)}>
                {gameGradeConfig.label}
              </Badge>
            )}

            {setup.outcome && (
              <Badge variant="outline" className="text-[10px]">
                Outcome: {setup.outcome}
              </Badge>
            )}

            {setup.decision && (
              <Badge variant="outline" className="text-[10px]">
                Decision: {setup.decision}
              </Badge>
            )}
          </div>

          {created && <span>erstellt: {created}</span>}
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(setup);
            }}
          >
            Bearbeiten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupCard;
