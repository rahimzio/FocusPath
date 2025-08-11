import React from "react";

/** Ideal-state model */
export type FrequencyIdeal = {
  beliefsIdeal: string;
  convictionTarget: number; // 0–10
  desiredIdentity: string;
  desiredEmotions: string;
  desiredFocus: string;
  responsePattern: string;
  expectationsIdeal: string;
  microEvidencePlan: string; // kleine, sofortige Evidenz-Schritte
};

type Props = {
  value?: Partial<FrequencyIdeal> | null;
  onChange?: (patch: Partial<FrequencyIdeal>) => void;
  onBack?: () => void;
  onFinish?: () => void;
};

const defaults: FrequencyIdeal = {
  beliefsIdeal: "",
  convictionTarget: 10,
  desiredIdentity: "",
  desiredEmotions: "",
  desiredFocus: "",
  responsePattern: "",
  expectationsIdeal: "",
  microEvidencePlan: "",
};

export default function StepFormIdeal({
  value,
  onChange,
  onBack,
  onFinish,
}: Props) {
  const v: FrequencyIdeal = { ...defaults, ...(value ?? {}) };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Ziel-Frequenz</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Neue Überzeugungen (Beliefs – Ideal)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.beliefsIdeal}
            onChange={(e) => onChange?.({ beliefsIdeal: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Ziel-Überzeugung / Sicherheit (0–10)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={10}
              value={v.convictionTarget}
              onChange={(e) => onChange?.({ convictionTarget: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-8 text-right font-medium">{v.convictionTarget}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gewünschte Identität</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.desiredIdentity}
            onChange={(e) => onChange?.({ desiredIdentity: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gewünschte Emotionen</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.desiredEmotions}
            onChange={(e) => onChange?.({ desiredEmotions: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gewünschter Fokus</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.desiredFocus}
            onChange={(e) => onChange?.({ desiredFocus: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Response-Pattern (statt Reaktion)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.responsePattern}
            onChange={(e) => onChange?.({ responsePattern: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Erwartungen (Ideal)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.expectationsIdeal}
            onChange={(e) => onChange?.({ expectationsIdeal: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mikro-Evidenz Plan (heute / diese Woche)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.microEvidencePlan}
            onChange={(e) => onChange?.({ microEvidencePlan: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded border"
          >
            Zurück
          </button>
        )}
        <button
          type="button"
          onClick={onFinish}
          className="px-3 py-2 rounded bg-green-600 text-white"
        >
          Abschließen
        </button>
      </div>
    </div>
  );
}
