// components/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  progress: number; // Wert zwischen 0 und 100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Dynamische Farbgebung mit weichen Übergängen
  let progressColor = "bg-gray-400"; // Standard grau
  if (progress >= 100) progressColor = "bg-green-500";
  else if (progress >= 50) progressColor = "bg-yellow-400";
  else if (progress > 0) progressColor = "bg-red-400";

  return (
    <div className="w-full bg-gray-200 rounded-full h-5 relative shadow-inner">
      <div
        className={`${progressColor} h-5 rounded-full transition-all duration-500 ease-in-out`}
        style={{ width: `${progress}%` }}
      ></div>
      <span className="absolute inset-0 flex justify-center items-center text-xs font-bold text-white">
        {progress}%
      </span>
    </div>
  );
};

export default ProgressBar;

