// pages/trading.tsx
import React from "react";
import dynamic from "next/dynamic";
// Dynamischer Import der TradingOverview-Komponente
const TradingOverview = dynamic(
  () => import("@/components/trading/tradingOverviews"),
  {
    loading: () => <p>Lade Trading Dashboard...</p>,
    ssr: false,
  }
);

const TradingPage = () => {
  return <TradingOverview />;
};

export default TradingPage;
