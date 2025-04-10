// pages/api/cron/backup.ts (optional Route trigger)
import backupAppData from "../db/backup";
export default async function handler(res:any) {
  await backupAppData();
  res.status(200).json({ status: "Backup completed" });
}

/*
import cron from "node-cron";
import { backupAppData } from "@/utils/backup";

// Läuft täglich um 00:30 Uhr
cron.schedule("30 0 * * *", async () => {
  console.log("🚀 Starte tägliches Backup...");
  await backupAppData();
});*/
