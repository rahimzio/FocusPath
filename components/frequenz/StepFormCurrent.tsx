import React from "react";

/** Current-state model */
export type FrequencyCurrent = {
  beliefs: string;
  convictionNow: number; // 0–10
  perceptionSelf: string;
  emotionalState: string;
  focusLeaks: string;
  defaultReactions: string;
  defaultExpectations: string;
};

type Props = {
  /** Can be null/partial at first render – we’ll merge with defaults safely */
  value?: Partial<FrequencyCurrent> | null;
  /** Patch-style change handler: only send the changed fields */
  onChange?: (patch: Partial<FrequencyCurrent>) => void;
  onBack?: () => void;
  onNext?: () => void;
};

const defaults: FrequencyCurrent = {
  beliefs: "",
  convictionNow: 0,
  perceptionSelf: "",
  emotionalState: "",
  focusLeaks: "",
  defaultReactions: "",
  defaultExpectations: "",
};

export default function StepFormCurrent({
  value,
  onChange,
  onBack,
  onNext,
}: Props) {
  // Merge null/undefined with defaults → always safe to read fields
  const v: FrequencyCurrent = { ...defaults, ...(value ?? {}) };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Aktuelle Frequenz</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Überzeugungen (Beliefs)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.beliefs}
            onChange={(e) => onChange?.({ beliefs: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Aktuelle Überzeugung / Sicherheit (0–10)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={10}
              value={v.convictionNow}
              onChange={(e) => onChange?.({ convictionNow: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="w-8 text-right font-medium">{v.convictionNow}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Selbstwahrnehmung</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.perceptionSelf}
            onChange={(e) => onChange?.({ perceptionSelf: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vorherrschender Emotionszustand</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.emotionalState}
            onChange={(e) => onChange?.({ emotionalState: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fokus-Leaks (Ablenkungen / Energieverlust)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.focusLeaks}
            onChange={(e) => onChange?.({ focusLeaks: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Standard-Reaktionen</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.defaultReactions}
            onChange={(e) => onChange?.({ defaultReactions: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Erwartungen (Default)</label>
          <textarea
            className="w-full rounded border p-2"
            rows={3}
            value={v.defaultExpectations}
            onChange={(e) => onChange?.({ defaultExpectations: e.target.value })}
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
          onClick={onNext}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}
