import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { IncomeEntry, expense, SavingEntry, SavingGoal } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const incomeCol = db.collection<IncomeEntry>("incomeEntries");
    const expenseCol = db.collection<expense>("expenses");
    const savingCol = db.collection<SavingEntry>("finance");
    const goalCol = db.collection<SavingGoal>("savingGoals");

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

    const currentIncome = await incomeCol.find({ userId, month: currentMonthStr }).toArray();
    const startCurr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endCurr = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const currentExpenses = await expenseCol
      .find({ userId, dueDate: { $gte: startCurr, $lt: endCurr } })
      .toArray();
    const currentSavings = await savingCol.find({ userId, month: currentMonthStr }).toArray();

    const prevIncome = await incomeCol.find({ userId, month: prevMonthStr }).toArray();
    const startPrev = new Date(prev.getFullYear(), prev.getMonth(), 1).toISOString();
    const endPrev = new Date(prev.getFullYear(), prev.getMonth() + 1, 1).toISOString();
    const prevExpenses = await expenseCol
      .find({ userId, dueDate: { $gte: startPrev, $lt: endPrev } })
      .toArray();

    const incomeTotal = currentIncome.reduce((s, e) => s + e.amount, 0);
    const savingsTotal = currentSavings.reduce((s, e) => s + e.amount, 0);
    const savingRate = incomeTotal ? savingsTotal / incomeTotal : 0;

    const currExpTotal = currentExpenses.reduce((s, e) => s + e.amount, 0);
    const prevExpTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const expenseGrowth = prevExpTotal ? (currExpTotal - prevExpTotal) / prevExpTotal : 0;

    const investmentROI = 0; // Placeholder - no investment data yet

    const emergencyGoal = await goalCol.findOne({ userId, title: /emergency/i });
    const emergencyFundStatus = emergencyGoal
      ? { current: emergencyGoal.currentAmount, target: emergencyGoal.targetAmount }
      : { current: 0, target: 0 };

    return res.status(200).json({ savingRate, expenseGrowth, investmentROI, emergencyFundStatus });
  } catch (error) {
    console.error("metrics", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}