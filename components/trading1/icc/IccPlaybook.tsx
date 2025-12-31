// components/trading1/icc/IccPlaybook.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IccPlaybookTemplateId } from "../interface"; // ⬅️ NEU: gemeinsamer Typ

export interface IccTemplate {
  id: IccPlaybookTemplateId;
  label: string;
  description: string;
  useCase: string;
  checklist: string[];
}

export const ICC_TEMPLATES: IccTemplate[] = [
  {
    id: "icc_basic",
    label: "ICC Basic",
    description:
      "Standard-ICC-Setup für saubere Trend-Trades in London / New York. Fokus: 4H Indication + 1H Struktur + klarer LTF-Trigger.",
    useCase:
      "Nutzen, wenn Markt klar trendet und du dein „A-Game“-Setup spielen willst.",
    checklist: [
      "HTF-Trend (4H / Daily) ist eindeutig (bullish / bearish, kein Chop).",
      "Wir sind in der richtigen Trend-Phase (Indication → Correction → Continuation).",
      "4H-Indication ist klar markiert (Level / Zone).",
      "Preis ist an oder sehr nahe an der relevanten 4H-Indication.",
      "1H-Struktur respektiert den HTF-Trend (HH/HL im Uptrend oder LH/LL im Downtrend).",
      "Es gab einen klaren BOS im relevanten Swing (nicht nur Noise).",
      "Timeframe-Kombo ist definiert (z. B. 4H + 1H + 15m).",
      "Entry kommt aus der Ursprungs-Impulse-Zone (nicht mitten im Move).",
      "Session ist London oder New York, Uhrzeit in deinem „Heat“-Window.",
      "Target ist Gegenseite: Buys to Sellers / Sells to Buyers.",
    ],
  },
  {
    id: "icc_advanced",
    label: "ICC Advanced / Aggressiv",
    description:
      "Aggressiver ICC-Ansatz für Reversal- oder Spät-Session-Setups. Mehr Erfahrung nötig, höhere Anforderungen an Kontext.",
    useCase:
      "Nutzen, wenn du bewusst aggressiver in den Markt gehst (z. B. Reversal nach ausgedehntem Trend) und mental stabil bist.",
    checklist: [
      "HTF zeigt Überdehnung (z. B. viele gleiche Trend-Kerzen, Parabolik, Liquidity-Sweeps).",
      "Klares Reversal-Signal am HTF-Level (z. B. Swing-Failure, deutlicher Rejection-Wick).",
      "1H-Struktur beginnt zu brechen (erste LH/LL im Uptrend oder HH/HL im Downtrend).",
      "LTF zeigt frühe Strukturwechsel (z. B. 5m / 15m BOS gegen alten Trend).",
      "Risk ist reduziert (z. B. 0.5–1 % im Funded statt 1.5 %).",
      "RR bleibt ICC-konform (mindestens 2R, Zielbereich logisch).",
      "Session & Zeit sind bewusst gewählt (kein Overtrading „weil langweilig“).",
      "Du bist mental klar (kein Revenge, kein FOMO, keine Müdigkeit).",
    ],
  },
];

interface IccPlaybookProps {
  className?: string;
  /** aktuell ausgewähltes Template (falls du es mit einem Form verknüpfen willst) */
  selectedTemplateId?: IccPlaybookTemplateId | null;
  /** Callback, wenn der User ein Template übernehmen möchte */
  onSelectTemplate?: (templateId: IccPlaybookTemplateId) => void;
}

/**
 * ICC Playbook
 *
 * Zeigt deine ICC-Regeln als lesbare Text-Blocks + Templates.
 * Optional kannst du ein Template „übernehmen“, um es mit einem Trade zu verknüpfen.
 */
export const IccPlaybook: React.FC<IccPlaybookProps> = ({
  className,
  selectedTemplateId,
  onSelectTemplate,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ICC Playbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <p>
            Hier liegen deine Kern-Regeln für ICC-Trades: Trend-Kontext,
            Timeframe-Korrelation, Entry- und Exit-Regeln. Nutze das Playbook
            vor dem Entry wie ein kleines On-Screen-Coaching.
          </p>
          <p>
            Die Templates unten kannst du mit einem Trade verknüpfen (z. B.
            <span className="font-medium text-foreground">
              {" "}
              „ICC Basic“
            </span>{" "}
            oder{" "}
            <span className="font-medium text-foreground">
              „ICC Advanced“
            </span>
            ), um später deine Statistik je Template auszuwerten.
          </p>
        </CardContent>
      </Card>

      {/* Templates */}
      <div className="grid gap-4 md:grid-cols-2">
        {ICC_TEMPLATES.map((tpl) => {
          const isSelected = tpl.id === selectedTemplateId;
          return (
            <Card
              key={tpl.id}
              className={cn(
                "flex flex-col justify-between border-dashed",
                isSelected && "border-primary bg-primary/5"
              )}
            >
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{tpl.label}</CardTitle>
                  <Badge variant={isSelected ? "default" : "outline"}>
                    {isSelected ? "Ausgewählt" : "Template"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tpl.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <p className="mb-1 font-medium text-foreground">
                    Wann nutzen?
                  </p>
                  <p className="text-muted-foreground">{tpl.useCase}</p>
                </div>
                <div>
                  <p className="mb-1 font-medium text-foreground">
                    Pre-Trade Checklist (Kurzfassung)
                  </p>
                  <ul className="space-y-1 pl-4">
                    {tpl.checklist.slice(0, 5).map((item, idx) => (
                      <li key={idx} className="list-disc text-muted-foreground">
                        {item}
                      </li>
                    ))}
                    {tpl.checklist.length > 5 && (
                      <li className="list-disc text-muted-foreground/80">
                        … weitere Punkte siehe Detail-Notizen oder dein
                        Journal.
                      </li>
                    )}
                  </ul>
                </div>

                {onSelectTemplate && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="text-[11px]"
                      onClick={() => onSelectTemplate(tpl.id)}
                    >
                      {isSelected
                        ? "Template aktiv"
                        : "Template für Trade übernehmen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IccPlaybook;
