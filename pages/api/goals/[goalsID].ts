// /pages/api/goals/[goalId].ts
import updateGoalProgress from "./updateGoals";
export default async function handler(req: { query: { goalId: any; }; method: string; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { message: unknown; }): void; new(): any; }; }; }) {
  const { goalId } = req.query;

  if (req.method === 'PUT') {
    try {
      const updatedGoal = await updateGoalProgress(goalId);
      res.status(200).json(updatedGoal);
    } catch (error) {
      res.status(500).json({ message: error });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
