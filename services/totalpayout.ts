import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { connectDB } from "@/lib/mongodb";

export async function getTotalPayout(user_id: string) {
  await connectDB();

  const [daily, weekly] = await Promise.all([
    DailyPayout.aggregate([
      { $match: { user_id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    WeeklyPayout.aggregate([
      { $match: { user_id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return (daily[0]?.total || 0) + (weekly[0]?.total || 0);
}


export function checkHoldStatus(totalPayout: number, pv: number): boolean {
  if (totalPayout >= 300000 && pv < 100) return true;
  if (totalPayout >= 150000 && pv < 50) return true;
  if (totalPayout >= 50000 && pv < 25) return true;
  return false;
}
