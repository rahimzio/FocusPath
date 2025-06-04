import { getSession } from "next-auth/react";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

const StatsDashboard = dynamic(() => import("@/components/stats/StatsDashboard"), {
  loading: () => <p>Loading ratings...</p>,
  ssr: false,
});

const WeekMonthStatsDisplay = dynamic(() => import("@/components/stats/WeekMonthStatsDisplay"), {
  loading: () => <p>Loading week/month stats...</p>,
  ssr: false,
});

const TrustReserveTank = dynamic(() => import("@/components/stats/TrustReserveTank"), {
  loading: () => <p>Loading trust tank...</p>,
  ssr: false,
});


const StatsPage = () => {
  const [userId, setUserId] = useState("");

  useEffect(() => {
    getSession().then((session) => {
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    });
  }, []);

  if (!userId) {
    return <p className="p-4">Lade Benutzerdaten...</p>;
  }

  return (
    <React.Suspense fallback={<div>Lade Statistiken...</div>}>
      <div className="space-y-6">
        <StatsDashboard userId={userId} />
        <WeekMonthStatsDisplay userId={userId} />
        <TrustReserveTank userId={userId} />
      </div>
    </React.Suspense>
  );
};

export default StatsPage;
