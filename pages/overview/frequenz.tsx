// pages/Goal.tsx
import dynamic from "next/dynamic";
import React from "react";

const FrequenzOverviewDashboard = dynamic(
    () => import("@/components/frequenz/FrequenzOverviewDashboard"),
    {
        loading: () => <p>Loading...</p>,
        ssr: false,
    }
);

const FrequenzPage = () => (
    <React.Suspense fallback={<div>Loading...</div>}>
        <FrequenzOverviewDashboard />
    </React.Suspense>
);

export default FrequenzPage;
