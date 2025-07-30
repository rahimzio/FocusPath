"use client";
import { useState } from "react";

const tabs = ["Tage", "Wochen", "Monate"] as const;

export default function RecapAccordion() {
  const [active, setActive] = useState<typeof tabs[number]>("Tage");

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={`px-2 py-1 rounded ${active === t ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className="w-8 h-8 bg-gray-200" />
        ))}
      </div>
    </div>
  );
}