import React from "react";
import StatProfileView from "@/components/football-stats/StatProfileView";
import { FootballStatProfile } from "@/utils/football/stats";

const sampleProfile: FootballStatProfile = {
  userId: "demo",
  speed: {
    sprint: { level: 72, xp: 10, lastUpdated: new Date() },
    topSpeed: { level: 68, xp: 20, lastUpdated: new Date() },
    agility: { level: 74, xp: 5, lastUpdated: new Date() },
  },
  endurance: {
    cooper: { level: 65, xp: 0, lastUpdated: new Date() },
    beepTest: { level: 60, xp: 0, lastUpdated: new Date() },
    treadmill: { level: 0, xp: 0, lastUpdated: new Date() },
  },
  playstyles: ["finisher"],
  history: [
    {
      date: new Date("2024-05-01"),
      snapshot: {
        speed: {
          sprint: { level: 60, xp: 0, lastUpdated: new Date("2024-05-01") },
        },
        endurance: {
          cooper: { level: 55, xp: 0, lastUpdated: new Date("2024-05-01") },
        },
      },
      label: "Mai 2024",
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FootballStatsPage = () => (
  <div className="p-6">
    <h1 className="text-2xl font-bold mb-6">Football Stats Demo</h1>
    <StatProfileView profile={sampleProfile} />
  </div>
);

export default FootballStatsPage;