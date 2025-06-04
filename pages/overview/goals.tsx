// pages/Goal.tsx
import dynamic from "next/dynamic";
import React from "react";

const GoalOverviewDashboard = dynamic(
  () => import("@/components/goal/GoalOverviewDashboard"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false,
  }
);

const GoalPage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <GoalOverviewDashboard />
  </React.Suspense>
);

export default GoalPage;
