// pages/finance.tsx
import dynamic from "next/dynamic";
import React from "react";

const GoalsOverview = dynamic(
  () => import("@/components/goal/goalsOverview"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false, // Optional: Deaktiviert die serverseitige Darstellung
  }
);

const FinancePage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <GoalsOverview />
  </React.Suspense>
);

export default FinancePage;