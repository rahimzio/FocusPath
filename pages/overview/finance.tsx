import dynamic from "next/dynamic";
import React from "react";

const FinanceDashboard = dynamic(
  () => import("@/components/finance/FinanceDashboard"),
  { loading: () => <p>Loading...</p>, ssr: false }
);

export default function FinancePage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <FinanceDashboard />
    </React.Suspense>
  );
}