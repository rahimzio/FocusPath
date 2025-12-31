"use client";

import * as React from "react";
import { TradeEntry } from "../interface";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TradeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: TradeEntry | null;
  onOpenSetup?: (setupId?: string | null) => void;
}

export const TradeDetailDialog: React.FC<TradeDetailDialogProps> = ({
  open,
  onOpenChange,
  trade,
  onOpenSetup,
}) => {
  if (!trade) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kein Trade ausgewählt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Wähle einen Trade aus der Liste, um Details zu sehen.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const dateLabel = trade.date ? new Date(trade.date).toLocaleString() : "—";

  const setupId = trade.setupId ? String(trade.setupId) : undefined;
  const setupLabel =
    trade.setupLabel ?? trade.setup ?? (setupId ? `#${setupId}` : "—");

  const setupValueNode = onOpenSetup && setupId ? (
    <button
      type="button"
      onClick={() => onOpenSetup(setupId)}
      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
    >
      {setupLabel}
    </button>
  ) : (
    setupLabel
  );

  const iccRuleEval = evaluateIccRules(trade);

  // ------------------------------------------------------
  // ICC Timeframe Map – Berechnung
  // ------------------------------------------------------

  const iccPriceAt4h = !!trade.iccChecklistPriceAt4h;
  const icc1hFollowsTrend = !!trade.iccChecklist1HFollowsTrend;
  const iccBosSwing = !!trade.iccChecklistBosSwing;
  const iccTfCorrelation = !!trade.iccChecklistTfCorrelation;
  const iccEntryImpulse = !!trade.iccChecklistEntryImpulseZone;
  const iccSessionTime = !!trade.iccChecklistSessionTime;
  const iccTargetOpp = !!trade.iccChecklistTargetOppositeSide;

  const fourHChecks = [iccPriceAt4h];
  const oneHChecks = [icc1hFollowsTrend, iccBosSwing];
  const ltfChecks = [iccTfCorrelation, iccEntryImpulse, iccSessionTime, iccTargetOpp];

  const countPassed = (arr: boolean[]) => arr.filter(Boolean).length;

  const fourHPassed = countPassed(fourHChecks);
  const oneHPassed = countPassed(oneHChecks);
  const ltfPassed = countPassed(ltfChecks);

  const fourHTotal = fourHChecks.length;
  const oneHTotal = oneHChecks.length;
  const ltfTotal = ltfChecks.length;

  type IccStepStatus = "good" | "neutral" | "warn";

  const computeStatus = (passed: number, total: number): IccStepStatus => {
    if (total === 0) return "neutral";
    const ratio = passed / total;
    if (ratio >= 0.75) return "good";
    if (ratio <= 0.4) return "warn";
    return "neutral";
  };

  const fourHStatus = computeStatus(fourHPassed, fourHTotal);
  const oneHStatus = computeStatus(oneHPassed, oneHTotal);
  const ltfStatus = computeStatus(ltfPassed, ltfTotal);

  const hasIccData =
    trade.isICC ||
    !!trade.iccTrendHTF ||
    !!trade.iccTrendPart ||
    !!trade.iccFourHStatus ||
    !!trade.iccOneHStructure ||
    !!trade.iccTimeframeCombo ||
    fourHChecks.some(Boolean) ||
    oneHChecks.some(Boolean) ||
    ltfChecks.some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">
              {trade.symbol} – {trade.setupLabel ?? trade.setup ?? "Ohne Setup"}
            </span>
            <Badge className="text-[10px] uppercase">{trade.result}</Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {dateLabel}
            {trade.accountName ? ` · Account: ${trade.accountName}` : ""}
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-6 text-xs">
          <div className="grid gap-4 md:grid-cols-4">
            <DetailBox label="Entry" value={trade.entry} />
            <DetailBox label="Exit" value={trade.exit} />
            <DetailBox label="Stop Loss" value={trade.stopLoss} />
            <DetailBox label="Position Size" value={trade.positionSize} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <DetailBox label="PnL" value={trade.pnl?.toFixed(2)} />
            <DetailBox
              label="Rating"
              value={trade.rating != null ? `${trade.rating}/10` : "—"}
            />
            <DetailBox label="Session" value={trade.session ?? "—"} />
            <DetailBox label="Game" value={trade.gameGrade ?? "—"} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Setup klickbar, wenn onOpenSetup + setupId vorhanden */}
            <DetailBox label="Setup" value={setupValueNode} />
            <DetailBox
              label="Gruppe / Strategie"
              value={trade.groupName ?? "—"}
            />
          </div>

          {/* ICC Timeframe Map – zeigt 4H → 1H → LTF Konsistenz */}
          {hasIccData && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                ICC Timeframe Map
              </p>
              <p className="text-[11px] text-muted-foreground">
                4H → 1H → LTF – wie gut der Trade deine ICC-Multi-Timeframe-Story trifft.
              </p>

              <div className="grid gap-2 md:grid-cols-3">
                <IccStepBox
                  label="4H"
                  status={fourHStatus}
                  title={
                    trade.iccTrendHTF
                      ? `${String(trade.iccTrendHTF).toUpperCase()} · ${
                          trade.iccFourHStatus ?? "-"
                        }`
                      : "4H-Kontext"
                  }
                  details={`Checklist: ${fourHPassed}/${fourHTotal} (Price @ 4H-Indication)`}
                />
                <IccStepBox
                  label="1H"
                  status={oneHStatus}
                  title={
                    trade.iccOneHStructure
                      ? `Struktur: ${trade.iccOneHStructure}`
                      : "1H-Struktur"
                  }
                  details={`Checklist: ${oneHPassed}/${oneHTotal} (Trend-Follow + BOS)`}
                />
                <IccStepBox
                  label="LTF (15m/5m)"
                  status={ltfStatus}
                  title={trade.iccTimeframeCombo ?? "Entry-Timeframes"}
                  details={`Checklist: ${ltfPassed}/${ltfTotal} (TF-Korrelation, Entry-Zone, Session, Target)`}
                />
              </div>
            </div>
          )}

          {/* ICC-Regelcheck – nur für ICC-Trades anzeigen */}
          {trade.isICC && iccRuleEval.total > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold">
                  ICC-Regelcheck (auto)
                </p>
                <span
                  className={
                    iccRuleEval.passed === iccRuleEval.total
                      ? "text-[11px] font-semibold text-emerald-600"
                      : iccRuleEval.passed >=
                        Math.round(iccRuleEval.total * 0.7)
                      ? "text-[11px] font-semibold text-amber-600"
                      : "text-[11px] font-semibold text-red-600"
                  }
                >
                  {iccRuleEval.passed}/{iccRuleEval.total} Regeln erfüllt
                </span>
              </div>

              <div className="space-y-1">
                {iccRuleEval.rules.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between gap-2 rounded border bg-background/60 px-2 py-1"
                  >
                    <span className="text-[11px]">{r.label}</span>
                    <span
                      className={
                        r.ok
                          ? "text-[11px] font-semibold text-emerald-600"
                          : "text-[11px] font-semibold text-red-600"
                      }
                    >
                      {r.ok ? "✅" : "❌"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trade.screenshotUrl && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[11px]">Screenshot</span>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="text-[11px]"
              >
                <a
                  href={trade.screenshotUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Screenshot öffnen
                </a>
              </Button>
            </div>
          )}

          {trade.tags && trade.tags.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium">Tags</p>
              <div className="flex flex-wrap gap-1">
                {trade.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] font-medium">Gedanken</p>
              <p className="rounded-md border bg-muted/40 p-2 min-h-[60px]">
                {trade.thoughts?.trim() || (
                  <span className="text-muted-foreground">
                    Keine Einträge.
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium">Notizen</p>
              <p className="rounded-md border bg-muted/40 p-2 min-h-[60px]">
                {trade.notes?.trim() || (
                  <span className="text-muted-foreground">
                    Keine Notizen.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium">Rule Break</p>
            {trade.ruleBreak ? (
              <div className="rounded-md border border-amber-500/60 bg-amber-500/5 p-2">
                <p className="text-[11px] font-semibold text-amber-600">
                  ✅ Regelverstoß markiert
                </p>
                <p className="mt-1 text-[11px]">
                  {trade.ruleBreakNotes?.trim() ||
                    "Regelverstoß ohne weitere Notizen."}
                </p>
              </div>
            ) : (
              <p className="rounded-md border bg-muted/40 p-2 text-muted-foreground">
                Kein Rule Break markiert.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface DetailBoxProps {
  label: string;
  value: React.ReactNode;
}

const DetailBox: React.FC<DetailBoxProps> = ({ label, value }) => {
  return (
    <div className="rounded-md border bg-muted/40 p-2">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-medium">
        {value ?? <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
};

// ------------------------------------------------------
// ICC Timeframe Map – Step Komponente
// ------------------------------------------------------

interface IccStepBoxProps {
  label: string;
  status: "good" | "neutral" | "warn";
  title: string;
  details: string;
}

const IccStepBox: React.FC<IccStepBoxProps> = ({
  label,
  status,
  title,
  details,
}) => {
  let statusClasses = "border bg-muted/40"; // neutral
  let statusPill = "Neutral";

  if (status === "good") {
    statusClasses = "border-emerald-500/60 bg-emerald-500/5";
    statusPill = "Fit";
  } else if (status === "warn") {
    statusClasses = "border-red-500/60 bg-red-500/5";
    statusPill = "Warnung";
  }

  return (
    <div className={`rounded-md border p-2 ${statusClasses}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
          {statusPill}
        </span>
      </div>
      <p className="text-[11px] font-medium">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{details}</p>
    </div>
  );
};

// ------------------------------------------------------
// Helper: automatische ICC-Regelchecks
// ------------------------------------------------------

type IccRuleResult = {
  key: string;
  label: string;
  ok: boolean;
};

function evaluateIccRules(trade: TradeEntry): {
  rules: IccRuleResult[];
  passed: number;
  total: number;
} {
  if (!trade.isICC) {
    return { rules: [], passed: 0, total: 0 };
  }

  const rules: IccRuleResult[] = [];

  // 1) Session: London oder New York
  const isLondonOrNy =
    trade.session === "london" || trade.session === "new_york";
  rules.push({
    key: "session",
    label: "Session: London oder New York",
    ok: isLondonOrNy,
  });

  // 2) Geplantes RR ≥ 2 (falls vorhanden)
  const rr = typeof trade.plannedRR === "number" ? trade.plannedRR : undefined;
  const rrOk = rr === undefined ? false : rr >= 2;
  rules.push({
    key: "rr",
    label: "Geplantes RR ≥ 2R",
    ok: rrOk,
  });

  // 3) Risiko (Funded max 1.5 %, Privat max 5 %)
  const risk =
    typeof trade.riskPercent === "number" ? trade.riskPercent : undefined;
  let riskOk = true;
  if (risk != null) {
    if (trade.accountType === "funded") {
      riskOk = risk <= 1.5;
    } else if (trade.accountType === "private") {
      riskOk = risk <= 5;
    }
  } else {
    riskOk = false; // nix angegeben → eher "nicht okay"
  }
  rules.push({
    key: "risk",
    label: "Risiko im Rahmen (Funded ≤ 1.5 %, Privat ≤ 5 %)",
    ok: riskOk,
  });

  // 4) Asset-Whitelist (deine Kernmärkte)
  const whitelist = ["NAS100", "US100", "NAS", "XAUUSD", "BTCUSD", "SOLUSD"];
  const sym = (trade.symbol ?? "").toUpperCase();
  const onWhitelist = whitelist.some((w) => sym.includes(w));
  rules.push({
    key: "asset",
    label: "Asset im ICC-Kernuniversum (NAS/XAU/BTC/SOL)",
    ok: onWhitelist,
  });

  // 5) ICC-Checklist: mindestens 6/7 Häkchen (sehr streng)
  const checklistValues = [
    trade.iccChecklistPriceAt4h,
    trade.iccChecklist1HFollowsTrend,
    trade.iccChecklistBosSwing,
    trade.iccChecklistTfCorrelation,
    trade.iccChecklistEntryImpulseZone,
    trade.iccChecklistSessionTime,
    trade.iccChecklistTargetOppositeSide,
  ].map((v) => !!v);

  const checklistTotal = checklistValues.length;
  const checklistPassed = checklistValues.filter(Boolean).length;
  const checklistOk = checklistPassed >= 6;

  rules.push({
    key: "checklist",
    label: `ICC-Checklist: ${checklistPassed}/${checklistTotal} erfüllt (Ziel ≥ 6)`,
    ok: checklistOk,
  });

  const passed = rules.filter((r) => r.ok).length;
  const total = rules.length;

  return { rules, passed, total };
}
