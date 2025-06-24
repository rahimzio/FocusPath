import React from "react";

interface ProgressBarProps {
  progress: number; // value 0-100
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="bg-blue-600 h-3 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ProgressBar;