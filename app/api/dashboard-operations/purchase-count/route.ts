import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import { DailyPayout, WeeklyPayout } from "@/models/payout";

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

    // 🛒 1️⃣ Purchase Count (from orders)
    const purchaseCount = await Order.countDocuments({ user_id });

    // 💰 2️⃣ Total Payout (sum of all payouts)
    const dailyPayoutSum = await DailyPayout.aggregate([
      { $match: { user_id, status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const weeklyPayoutSum = await WeeklyPayout.aggregate([
      { $match: { user_id, status: "Completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalPayout =
      (dailyPayoutSum[0]?.total || 0) + (weeklyPayoutSum[0]?.total || 0);

    // 🎁 3️⃣ Reward Value
    const rewardSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Reward" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const rewardValue = rewardSum[0]?.total || 0;

    // ⚙️ 4️⃣ Matching Bonus
    const matchingBonusSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Matching Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const matchingBonus = matchingBonusSum[0]?.total || 0;

    // 💎 5️⃣ Infinity Bonus
    const infinityBonusSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Infinity Bonus" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const infinityBonus = infinityBonusSum[0]?.total || 0;

    // 👥 6️⃣ Direct Team Sales
    const directTeamSalesSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Direct Team Sales" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const directTeamSales = directTeamSalesSum[0]?.total || 0;

    // 🌐 7️⃣ Infinity Team Sales
    const infinityTeamSalesSum = await DailyPayout.aggregate([
      { $match: { user_id, name: "Infinity Team Sales" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const infinityTeamSales = infinityTeamSalesSum[0]?.total || 0;

    // 📦 8️⃣ Self PV (just an example; replace with actual logic if different)
    const selfPV = purchaseCount * 10; // e.g., 10 PV per order

    return NextResponse.json(
      {
        success: true,
        data: {
          user_id,
          totalPayout,
          selfPV,
          purchaseCount,
          rewardValue,
          matchingBonus,
          infinityBonus,
          directTeamSales,
          infinityTeamSales,
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
