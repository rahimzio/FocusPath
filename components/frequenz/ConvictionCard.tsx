import { useEffect, useState } from "react";
import { computeConvictionScore, ConvictionInputs } from "@/utils/conviction";

export default function ConvictionCard({ userId }: { userId: string }) {
  const [ema, setEma] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/conviction/today?userId=${userId}`);
      const data = await res.json(); // liefert inputs + prevEma
      const { ema } = computeConvictionScore(data.inputs as ConvictionInputs);
      setEma(ema);
    })();
  }, [userId]);

  const color =
    ema >= 85 ? "text-green-600" : ema >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">Conviction</h3>
        <span className={`text-2xl font-bold ${color}`}>{ema}</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">heute (glattgezogen)</p>
      <button className="mt-3 text-sm text-blue-600 hover:underline">
        Evidence anzeigen
      </button>
    </div>
  );
}