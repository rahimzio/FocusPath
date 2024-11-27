// pages/finance.tsx
import dynamic from "next/dynamic";
import React from "react";

const FinanceOverview = dynamic(
  () => import("@/components/finance/financeOverviews"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false, // Optional: Deaktiviert die serverseitige Darstellung
  }
);

const FinancePage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <FinanceOverview />
  </React.Suspense>
);

export default FinancePage;
