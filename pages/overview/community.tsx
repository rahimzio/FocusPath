// pages/finance.tsx
import dynamic from "next/dynamic";
import React from "react";

const CommunityOverview = dynamic(
  () => import("@/components/community/CommunityOverview"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false, // Optional: Deaktiviert die serverseitige Darstellung
  }
);

const FinancePage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <CommunityOverview />
  </React.Suspense>
);

export default FinancePage;