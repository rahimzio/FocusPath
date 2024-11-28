import dynamic from "next/dynamic";
import React from "react";

const ToDoOverview = dynamic(() => import("@/components/todo/to-do"), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Optional: Deaktiviert die serverseitige Darstellung
});

const FinancePage = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <ToDoOverview />
  </React.Suspense>
);

export default FinancePage;
