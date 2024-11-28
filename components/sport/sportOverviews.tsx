import React from "react";
import StatChart from "./statChart"; // Importiere mit Großbuchstaben
import StatChartComparison from "./statChartComparison"; // Importiere mit Großbuchstaben
import SoccerStats from "./soccerStats";

const SportOverview = () => {
  return (
    <div>
      <h1>Sport Overview</h1>

      {/* Verwende hier die Komponente mit Großbuchstaben */}
      <StatChart />
      <SoccerStats
        name="Meguru Bachira"
        stats={{
          kick: [
            "Kicking Power",
            "Shooting Accuracy",
            "Short Pass",
            "Long Pass",
            "Volley",
          ],
          physical: ["Stamina", "Acceleration", "Top Speed", "Jump", "Agility"],
          technique: [
            "Trapping",
            "Ball Control",
            "Heading",
            "Dribbling",
            "Tackling",
          ],
          totalScore: 86,
          grade: "A",
        }}
      />

      {/* Verwende statChartComparison mit dem richtigen Namen */}
      <StatChartComparison />
    </div>
  );
};

export default SportOverview;
