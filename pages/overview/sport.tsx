import dynamic from "next/dynamic";
import React from "react";

const SportOverview = dynamic(
  () => import("@/components/sport/sportOverviews"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false,
  }
);

const FinancePage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <SportOverview />
  </React.Suspense>
);

export default FinancePage;
