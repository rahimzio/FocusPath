// components/goal/GoalHeader.tsx

import React from "react";

const GoalHeader: React.FC = () => {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-3xl font-bold text-gray-800">🎯 Zielübersicht</h1>
      <p className="text-gray-600 mt-2 text-sm">
        Verwalte deine Jahres-, Monats-, Wochen- und Tagesziele an einem Ort.
      </p>
    </div>
  );
};

export default GoalHeader;
