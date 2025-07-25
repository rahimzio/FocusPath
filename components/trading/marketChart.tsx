// components/trading/MarketChart.tsx
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Registrierung der benötigten Komponenten
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const data = {
  labels: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun"],
  datasets: [
    {
      label: "Preis",
      data: [120, 190, 170, 220, 200, 250],
      fill: false,
      backgroundColor: "blue",
      borderColor: "blue",
    },
  ],
};

const options = {
  responsive: true,
  scales: {
    y: {
      beginAtZero: false,
    },
  },
};

const MarketChart = () => {
  return (
        <Card>
      <CardHeader>
        <CardTitle>Marktchart</CardTitle>
      </CardHeader>
      <CardContent>
        <Line data={data} options={options} />
      </CardContent>
    </Card>
  );
};

export default MarketChart;
