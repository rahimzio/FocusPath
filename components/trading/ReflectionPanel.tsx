"use client";
import { useState } from "react";
import { TradeEntry } from "@/utils/interface";

interface Props {
  trade: TradeEntry;
  onSaved: () => void;
}

export default function ReflectionPanel({ trade, onSaved }: Props) {
  const [notes, setNotes] = useState(trade.reflectionNotes || "");
  const [loading, setLoading] = useState(false);
  const [emotionBefore, setEmotionBefore] = useState(trade.emotionBefore || "");
  const [triggerEvent, setTriggerEvent] = useState(trade.triggerEvent || "");
  const [mentalMistake, setMentalMistake] = useState(trade.mentalMistake || "");
  const [performanceState, setPerformanceState] = useState(trade.performanceState || "A");
  const [followedSetup, setFollowedSetup] = useState(!!trade.followedSetup);
  const [respectedStopLoss, setRespectedStopLoss] = useState(!!trade.respectedStopLoss);
  const [managedRisk, setManagedRisk] = useState(!!trade.managedRisk);
  const [tilt, setTilt] = useState(!!trade.tiltDetected);

  const disciplineScore = Math.round(((Number(followedSetup) + Number(respectedStopLoss) + Number(managedRisk)) / 3) * 100);
  const save = async () => {
    setLoading(true);
    await fetch(`/api/trades/update?id=${trade._id}&userId=${trade.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
body: JSON.stringify({
        reflectionNotes: notes,
        emotionBefore,
        triggerEvent,
        mentalMistake,
        performanceState,
        followedSetup,
        respectedStopLoss,
        managedRisk,
        disciplineScore,
        tiltDetected: tilt,
      }),
    });
    setLoading(false);
    onSaved();
  };

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="border p-1 w-full"
      />
       <div className="grid gap-2">
        <select
          value={emotionBefore}
          onChange={(e) => setEmotionBefore(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">Emotion vor dem Trade</option>
          <option value="Angst">Angst</option>
          <option value="Gier">Gier</option>
          <option value="Stress">Stress</option>
          <option value="Ruhe">Ruhe</option>
        </select>
        <textarea
          value={triggerEvent}
          onChange={(e) => setTriggerEvent(e.target.value)}
          placeholder="Trigger Event"
          className="border p-1 rounded"
        />
        <select
          value={mentalMistake}
          onChange={(e) => setMentalMistake(e.target.value)}
          className="border p-1 rounded"
        >
          <option value="">Mentaler Fehler</option>
          <option value="SL verschoben">SL verschoben</option>
          <option value="Overtrading">Overtrading</option>
          <option value="FOMO">FOMO</option>
        </select>
        <select
          value={performanceState}
          onChange={(e) => setPerformanceState(e.target.value as "A" | "B" | "C")}
          className="border p-1 rounded"
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={followedSetup}
            onChange={(e) => setFollowedSetup(e.target.checked)}
          />
          Setup befolgt
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={respectedStopLoss}
            onChange={(e) => setRespectedStopLoss(e.target.checked)}
          />
          StopLoss respektiert
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={managedRisk}
            onChange={(e) => setManagedRisk(e.target.checked)}
          />
          Risiko gemanagt
        </label>
        <div className="text-sm">Disziplin: {disciplineScore}</div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTilt(true)}
          className="bg-red-500 text-white px-2 py-1 rounded"
        >
          Tilt erkannt
        </button>
        <button
          onClick={save}
          disabled={loading}
          className="bg-blue-600 text-white px-2 py-1 rounded ml-auto"
        >
          {loading ? "Speichern..." : "Speichern"}
        </button>
      </div>
    </div>
  );
}