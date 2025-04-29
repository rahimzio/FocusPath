import React from "react";

interface TrustTankBarProps {
  currentTrust: number; // Wert zwischen 0 und 100
}

const getColorByTrustLevel = (trust: number) => {
  if (trust <= 39) return "bg-red-400";
  if (trust <= 69) return "bg-yellow-400";
  if (trust <= 89) return "bg-green-400";
  return "bg-yellow-100"; // Weiß/Gold
};

const getTrustLevelLabel = (trust: number) => {
  if (trust <= 39) return "Vertrauen niedrig";
  if (trust <= 69) return "Vertrauen durchschnittlich";
  if (trust <= 89) return "Vertrauen hoch";
  return "Vertrauen außergewöhnlich";
};

const TrustTankBar: React.FC<TrustTankBarProps> = ({ currentTrust }) => {
  const barColor = getColorByTrustLevel(currentTrust);
  const trustLabel = getTrustLevelLabel(currentTrust);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Trust Reserve Tank</h2>
      <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-8 ${barColor} transition-all duration-500`}
          style={{ width: `${currentTrust}%` }}
        />
      </div>
      <p className="text-center text-sm text-gray-600">{currentTrust}% – {trustLabel}</p>
    </div>
  );
};

export default TrustTankBar;
