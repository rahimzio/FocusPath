import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface TrustHistoryEntry {
  date: string; // ISO-String
  delta: number; // Veränderung an diesem Tag
}

interface TrustTankHistoryChartProps {
  history: TrustHistoryEntry[];
}

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return `${date.getDate()}.${date.getMonth() + 1}.`; // "25.4."
};

const TrustTankHistoryChart: React.FC<TrustTankHistoryChartProps> = ({ history }) => {
  // Sortiere nach Datum
  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Trust Tank Verlauf</h2>

      {history.length === 0 ? (
        <p className="text-gray-600">Noch keine Verlaufsdaten vorhanden.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={sortedHistory}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} />
            <YAxis domain={[-10, 10]} />
            <Tooltip formatter={(value) => `${value} Punkte`} labelFormatter={formatDate} />
            <Line
              type="monotone"
              dataKey="delta"
              stroke="#4ade80"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TrustTankHistoryChart;
