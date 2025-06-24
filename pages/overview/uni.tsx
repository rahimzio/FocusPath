import dynamic from "next/dynamic";
import React from "react";

const ModuleManager = dynamic(() => import("@/components/uni/ModuleManager"), {
  loading: () => <p>Lade...</p>,
  ssr: false,
});

const UniPage = () => <ModuleManager />;

export default UniPage;