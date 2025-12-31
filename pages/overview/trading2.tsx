// pages/trading.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

// Wir tippen die Props hier inline, dann musst du nichts extra importieren
const TradingDashboard = dynamic<{ userId: string }>(
  () => import("@/components/trading/tradingOverviews"),
  {
    loading: () => (
      <p className="p-4 text-sm text-muted-foreground">
        Trading Dashboard wird geladen...
      </p>
    ),
    ssr: false,
  }
);

const TradingPage: React.FC = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Session wird geladen...
      </p>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Du musst eingeloggt sein, um das Trading-Dashboard zu nutzen.
      </div>
    );
  }

  const userId = session.user.id as string;

  return <TradingDashboard userId={userId} />;
};

export default TradingPage;
