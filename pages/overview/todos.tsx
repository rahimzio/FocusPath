// pages/finance.tsx
import dynamic from "next/dynamic";
import React from "react";

const TodosOverview = dynamic(
  () => import("@/components/todos/todosOverview"),
  {
    loading: () => <p>Loading...</p>,
    ssr: false, // Optional: Deaktiviert die serverseitige Darstellung
  }
);

const TodoOverview = () => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <TodoOverview />
  </React.Suspense>
);

export default TodosOverview;
