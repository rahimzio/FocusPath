// components/stats/TrustReserveTank.tsx
import React, { useEffect, useState } from "react";

const TrustReserveTank = ({ userId }: { userId: string }) => {
  const [trustLevel, setTrustLevel] = useState<number>(0);
  const [status, setStatus] = useState<string>("Berechnung läuft...");

  useEffect(() => {
    const fetchTrust = async () => {
      const res = await fetch(`/api/stats/trustReserve?userId=${userId}`);
      const data = await res.json();
      setTrustLevel(data.trustLevel);
      setStatus(data.status);
    };
    fetchTrust();
  }, [userId]);

  const percentage = Math.min(Math.max(trustLevel, 0), 100);
  const getColor = () => {
    if (percentage >= 85) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-400";
    if (percentage >= 30) return "bg-orange-500";
    return "bg-red-600";
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-3">
      <h3 className="text-lg font-medium">🔋 Trust Reserve Tank</h3>
      <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-6 ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-600">{status}</p>
    </div>
  );
};

export default TrustReserveTank;
