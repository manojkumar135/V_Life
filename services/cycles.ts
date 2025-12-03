import { DailyPayout } from "@/models/payout";
import { User } from "@/models/user";

export async function get60DayStats(user_id: string) {
  const user = (await User.findOne({ user_id }).lean()) as any;
  if (!user) throw new Error("User not found");

  //------------------------------------------------
  // Parse activation date
  //------------------------------------------------
  let activationDate: Date;
  if (user.activated_date) {
    const [d, m, y] = user.activated_date.split("-");
    activationDate = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
  } else {
    activationDate = new Date(user.created_at);
  }

  activationDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  //------------------------------------------------
  // EXACT cycle block calculation
  //------------------------------------------------
  const diffDays = Math.floor(
    (today.getTime() - activationDate.getTime()) / 86400000
  );

  // Cycles are 60 days
  const cycleIndex = Math.floor(diffDays / 60) + 1;

  const cycleStart = new Date(activationDate);
  cycleStart.setDate(cycleStart.getDate() + (cycleIndex - 1) * 60);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 59);

  //------------------------------------------------
  // Days passed & remaining
  //------------------------------------------------
  const daysPassed = Math.floor(
    (today.getTime() - cycleStart.getTime()) / 86400000
  );

  const remainingDays = 60 - daysPassed;

  //------------------------------------------------
  // Matching bonus INSIDE current cycle
  //------------------------------------------------
  const agg = await DailyPayout.aggregate([
    {
      $match: {
        user_id,
        name: "Matching Bonus",
        created_at: { $gte: cycleStart, $lte: cycleEnd },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    cycleIndex,
    cycleStart: cycleStart.toISOString().split("T")[0],
    cycleEnd: cycleEnd.toISOString().split("T")[0],
    daysPassed,
    remainingDays,
    matchingBonus: agg[0]?.total || 0,
    matches: agg[0]?.count || 0,
  };
}
