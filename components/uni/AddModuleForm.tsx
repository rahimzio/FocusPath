import React, { useState } from "react";
import ProgressBar from "./ProgressBar";
import { OnlineModule } from "@/utils/interfaces/task";

interface Props {
  module: OnlineModule | null;
  onBack: () => void;
  onUpdated?: (m: OnlineModule) => void;
   onCreated: () => void;
}

const ModuleDetail: React.FC<Props> = ({ module, onBack, onUpdated }) => {
  const [current, setCurrent] = useState<OnlineModule | null>(module);

  if (!current) return null;

  const toggleUnit = async (chapterIdx: number, unitIdx: number) => {
    const updated = { ...current };
    const unit = updated.chapters[chapterIdx].units[unitIdx];
    unit.status = unit.status === "completed" ? "in-progress" : "completed";
    updated.completedUnits = updated.chapters
      .flatMap((c) => c.units)
      .filter((u) => u.status === "completed").length;
    setCurrent(updated);

    await fetch(`/api/modules/update?moduleId=${updated._id}&userId=${updated.userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    onUpdated && onUpdated(updated);
  };

  return (
    <div className="space-y-4">
      <button className="text-sm text-blue-600" onClick={onBack}>Zurück</button>
      <h2 className="text-xl font-semibold">{current.title}</h2>
      <ProgressBar progress={current.totalUnits ? (current.completedUnits / current.totalUnits) * 100 : 0} />

      {current.chapters.map((ch, cIdx) => (
        <div key={ch._id} className="border rounded p-2">
          <h3 className="font-medium">{ch.title}</h3>
          <div className="ml-4">
            {ch.units.map((u, uIdx) => (
              <label key={u._id} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={u.status === "completed"}
                  onChange={() => toggleUnit(cIdx, uIdx)}
                />
                <span>{u.title}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModuleDetail;