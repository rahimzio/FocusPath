"use client";
import { useState } from "react";
import { useRouter } from "next/router";
import { useMetaVisionProgress } from "@/hooks/useMetaVisionProgress";

const testItems = [
  { title: "Dribble-Slalom mit 5x Scanning", required: true },
  { title: "5x La Croqueta beidfüßig", required: true },
  { title: "Farbsignal-Reaktion", required: true },
  { title: "Freies Dribbling mit Schulterblick", required: true },
];

export default function LevelUpTest() {
  const router = useRouter();
  const { level } = router.query as { level?: string };
  const [checked, setChecked] = useState(testItems.map(() => false));
  const { passTest } = useMetaVisionProgress();

  const handleSubmit = () => {
    passTest(Number(level));
    router.push("/meta-vision");
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Level {level} Test</h2>
      <ul className="space-y-2">
        {testItems.map((item, idx) => (
          <li key={idx} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={checked[idx]}
              onChange={() => {
                const arr = [...checked];
                arr[idx] = !arr[idx];
                setChecked(arr);
              }}
            />
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSubmit}
        className="mt-4 bg-primary text-white px-4 py-2 rounded"
      >
        Test bestanden – nächstes Level freischalten
      </button>
    </div>
  );
}
