import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { User } from "@/models/user";
import { Score } from "@/models/score";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 }
      );
    }

    // 🧑‍💼 Fetch user to read activated_date
    const user = await User.findOne({ user_id });

    // 🆕 Compute days after activation
    let daysAfterActivation = 0;

    if (user?.activated_date) {
      // activated_date = "DD-MM-YYYY"
      const [day, month, year] = user.activated_date.split("-");

      // construct valid date: YYYY-MM-DD
      const activated = new Date(`${year}-${month}-${day}`);
      const now = new Date();

      if (!isNaN(activated.getTime())) {
        const diffTime = now.getTime() - activated.getTime();
        daysAfterActivation = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // 🛒 1️⃣ Purchase Count (from orders)
    const purchaseCount = await Order.countDocuments({ user_id });

    // 💰 2️⃣ Total Payout (sum of all payouts)
    const dailyPayoutSum = await DailyPayout.aggregate([
      { $match: { user_id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const weeklyPayoutSum = await WeeklyPayout.aggregate([
      { $match: { user_id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalPayout =
      (dailyPayoutSum[0]?.total || 0) + (weeklyPayoutSum[0]?.total || 0);

    // 🎁 3️⃣ Reward Amount (sum of reward_amount field from both)
    const [dailyReward, weeklyReward] = await Promise.all([
      DailyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$reward_amount" } } },
      ]),
      WeeklyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$reward_amount" } } },
      ]),
    ]);

    const rewardAmount =
      (dailyReward[0]?.total || 0) + (weeklyReward[0]?.total || 0);

    const rewardValue =
      (dailyReward[0]?.total || 0) + (weeklyReward[0]?.total || 0);

    // ⚙️ 4️⃣ Matching Bonus
    const matchingBonusSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Matching Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const matchingBonus = matchingBonusSum[0]?.total || 0;

    // 💎 5️⃣ Infinity Bonus (from Weekly Payouts only)
    const infinityBonusSum = await WeeklyPayout.aggregate([
      { $match: { user_id, name: "Infinity Matching Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const infinityBonus = infinityBonusSum[0]?.total || 0;

    // 👥 6️⃣ Direct Team Sales
    const directTeamSalesSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Direct Sales Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const directTeamSales = directTeamSalesSum[0]?.total || 0;

    // 🌐 7️⃣ Infinity Sales Bonus
    const infinitySalesBonusSum = await WeeklyPayout.aggregate([
      { $match: { user_id, name: "Infinity Sales Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const infinityTeamSales = infinitySalesBonusSum[0]?.total || 0;

    // 📦 8️⃣ Matching Bonus COUNT → matches
    const matchingBonusCountAgg = await DailyPayout.aggregate([
      { $match: { user_id, name: "Matching Bonus" } },
      { $count: "count" },
    ]);

    const matches = matchingBonusCountAgg[0]?.count || 0;

    // 🎯 9️⃣ Cashback Points (from Score)
    const scoreDoc = (await Score.findOne(
      { user_id },
      { "cashback.balance": 1 }
    ).lean()) as any;
    const cashbackPoints = scoreDoc?.cashback?.balance || 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id,
          totalPayout,
          matches,
          purchaseCount,
          rewardValue,
          matchingBonus,
          infinityBonus,
          directTeamSales,
          infinityTeamSales,
          daysAfterActivation,
          cashbackPoints
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}

// export async function getTotalPayout(user_id: string) {
//   await connectDB();

//   const [daily, weekly] = await Promise.all([
//     DailyPayout.aggregate([
//       { $match: { user_id } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]),
//     WeeklyPayout.aggregate([
//       { $match: { user_id } },
//       { $group: { _id: null, total: { $sum: "$amount" } } },
//     ]),
//   ]);

//   return (daily[0]?.total || 0) + (weekly[0]?.total || 0);
// }
