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
        { status: 400 },
      );
    }

    // 🧑‍💼 Fetch user to read activated_date
    const user = await User.findOne({ user_id });

    // 🆕 Compute days after activation
    let daysAfterActivation = 0;

    if (user?.activated_date) {
      const [day, month, year] = user.activated_date.split("-");
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

    // 🎁 3️⃣ Reward Amount
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

    const rewardValue =
      (dailyReward[0]?.total || 0) + (weeklyReward[0]?.total || 0);

    // ⚙️ 4️⃣ Matching Bonus
    const matchingBonusSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Matching Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const matchingBonus = matchingBonusSum[0]?.total || 0;

    // 💎 5️⃣ Infinity Bonus
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
    const directTeamSalesBonus = directTeamSalesSum[0]?.total || 0;

    const quickStarSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Quick Star Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const quickStarBonus = quickStarSum[0]?.total || 0;

    const referralSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Referral Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const referralBonus = referralSum[0]?.total || 0;
    const directTeamSales =
      directTeamSalesBonus + quickStarBonus + referralBonus;

    // console.log(
    //   "Direct Team Sales:",
    //   directTeamSales,
    //   quickStarBonus,
    //   referralBonus,
    // );

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

    // 🎯 9️⃣ Cashback Points
    const scoreDoc = (await Score.findOne(
      { user_id },
      { "cashback.balance": 1 },
    ).lean()) as any;
    const cashbackPoints = scoreDoc?.cashback?.balance || 0;

    // ✅ 🔟 Payout Released — status: completed or pending (case-insensitive)
    const releasedStatuses = ["completed", "pending"];
    const releasedRegex = new RegExp(`^(${releasedStatuses.join("|")})$`, "i");

    const [dailyReleased, weeklyReleased] = await Promise.all([
      DailyPayout.aggregate([
        { $match: { user_id, status: { $regex: releasedRegex } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      WeeklyPayout.aggregate([
        { $match: { user_id, status: { $regex: releasedRegex } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const payoutReleased =
      (dailyReleased[0]?.total || 0) + (weeklyReleased[0]?.total || 0);

    // 🔴 1️⃣1️⃣ Payout On Hold — status: onhold or failed (case-insensitive)
    const holdStatuses = ["onhold", "on hold", "hold", "failed"];
    const holdRegex = new RegExp(`^(${holdStatuses.join("|")})$`, "i");

    const [dailyHold, weeklyHold] = await Promise.all([
      DailyPayout.aggregate([
        { $match: { user_id, status: { $regex: holdRegex } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      WeeklyPayout.aggregate([
        { $match: { user_id, status: { $regex: holdRegex } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const payoutOnHold =
      (dailyHold[0]?.total || 0) + (weeklyHold[0]?.total || 0);

    // 🧾 TOTAL GST (from Orders)
    const gstSum = await Order.aggregate([
      { $match: { user_id } },
      { $group: { _id: null, total: { $sum: "$total_gst" } } },
    ]);

    const totalGST = gstSum[0]?.total || 0;

    // 💸 TOTAL TDS
    const [dailyTds, weeklyTds] = await Promise.all([
      DailyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$tds_amount" } } },
      ]),
      WeeklyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$tds_amount" } } },
      ]),
    ]);

    const totalTDS = (dailyTds[0]?.total || 0) + (weeklyTds[0]?.total || 0);

    // ⚙️ TOTAL ADMIN CHARGE
    const [dailyAdmin, weeklyAdmin] = await Promise.all([
      DailyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$admin_charge" } } },
      ]),
      WeeklyPayout.aggregate([
        { $match: { user_id } },
        { $group: { _id: null, total: { $sum: "$admin_charge" } } },
      ]),
    ]);

    const totalAdminCharge =
      (dailyAdmin[0]?.total || 0) + (weeklyAdmin[0]?.total || 0);

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
          cashbackPoints,
          payoutReleased,
          payoutOnHold,
          totalGST,
          totalTDS,
          totalAdminCharge,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
