import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { DailyPayout, WeeklyPayout } from "@/models/payout";
import { History } from "@/models/history"; // 🆕

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const user_id = searchParams.get("user_id"); // admin validation
    const date = searchParams.get("date"); // dd-mm-yyyy | yyyy-mm-dd
    const from = searchParams.get("from"); // dd-mm-yyyy | yyyy-mm-dd
    const to = searchParams.get("to"); // dd-mm-yyyy | yyyy-mm-dd

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 },
      );
    }

    /* =====================================================
       👤 ADMIN VALIDATION
    ===================================================== */
    const adminUser = await User.findOne({ user_id }).lean();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    /* =====================================================
       📅 DATE PARSER (SUPPORTS BOTH FORMATS)
       dd-mm-yyyy | yyyy-mm-dd
    ===================================================== */
    const parseDate = (input: string, end = false): Date | null => {
      let d: number, m: number, y: number;

      // dd-mm-yyyy
      if (/^\d{2}-\d{2}-\d{4}$/.test(input)) {
        [d, m, y] = input.split("-").map(Number);
      }
      // yyyy-mm-dd
      else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        [y, m, d] = input.split("-").map(Number);
      } else {
        return null;
      }

      return end
        ? new Date(y, m - 1, d, 23, 59, 59, 999)
        : new Date(y, m - 1, d, 0, 0, 0, 0);
    };

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (date && !from && !to) {
      startDate = parseDate(date);
      endDate = parseDate(date, true);
    }

    if (from || to) {
      if (from) startDate = parseDate(from);
      if (to) endDate = parseDate(to, true);
    }

    /* =====================================================
       🛒 SALES (ADMIN – ALL ORDERS)
       payment_date STRING → DATE
    ===================================================== */
    const orderBasePipeline: any[] = [
      {
        $addFields: {
          paymentDateObj: {
            $dateFromString: {
              dateString: "$payment_date",
              format: "%d-%m-%Y",
            },
          },
        },
      },
    ];

    if (startDate || endDate) {
      orderBasePipeline.push({
        $match: {
          paymentDateObj: {
            ...(startDate && { $gte: startDate }),
            ...(endDate && { $lte: endDate }),
          },
        },
      });
    }

    const totalSalesAgg = await Order.aggregate([
      ...orderBasePipeline,
      { $group: { _id: null, total: { $sum: "$final_amount" } } },
    ]);

    const firstOrderAgg = await Order.aggregate([
      ...orderBasePipeline,
      { $match: { is_first_order: true } },
      { $group: { _id: null, total: { $sum: "$final_amount" } } },
    ]);

    const reorderAgg = await Order.aggregate([
      ...orderBasePipeline,
      { $match: { is_first_order: false } },
      { $group: { _id: null, total: { $sum: "$final_amount" } } },
    ]);

    // 🆕 ADVANCE SALES (from History where advance: true)
    const advanceDateMatch =
      startDate || endDate
        ? {
            advance: true,
            transaction_type: "Debit", // ✅ only real advance payments
            details: { $regex: "Advance Payment", $options: "i" }, // ✅ extra safety
            created_at: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          }
        : {
            advance: true,
            transaction_type: "Debit", // ✅ important
            details: { $regex: "Advance Payment", $options: "i" }, // ✅ optional but safe
          };

    const advanceAgg = await History.aggregate([
      { $match: advanceDateMatch },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const advanceSales = advanceAgg[0]?.total || 0;
    const orderSales = totalSalesAgg[0]?.total || 0;
    const totalSales = orderSales + advanceSales; // 🆕 combined total

    /* =====================================================
       📦 ORDER COUNTS
       Single aggregation — replaces 3 separate queries
       Buckets:
         pending    = pending + packed
         dispatched = dispatched + out_for_delivery
         delivered  = delivered
         returned   = returned + cancelled
    ===================================================== */
    const orderStatusAgg = await Order.aggregate([
      ...orderBasePipeline,
      {
        $group: {
          _id: "$order_status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert array → map  { "pending": 5, "packed": 2, ... }
    const s = orderStatusAgg.reduce((acc: Record<string, number>, cur: any) => {
      acc[cur._id ?? "unknown"] = cur.count;
      return acc;
    }, {});

    // Total = sum of all statuses
    const totalOrdersCount = orderStatusAgg.reduce(
      (sum: number, cur: any) => sum + cur.count,
      0,
    );

    // ✅ Logical buckets as per requirement
    const pendingCount = (s["pending"] || 0) + (s["packed"] || 0);
    const dispatchedCount =
      (s["dispatched"] || 0) +
      (s["out_for_delivery"] || 0) +
      (s["delivered"] || 0);
    const deliveredCount = s["delivered"] || 0;
    const returnedCount = (s["returned"] || 0) + (s["cancelled"] || 0);

    /* =====================================================
       👥 USERS (ADMIN – ALL USERS)
    ===================================================== */
    const userDateMatch =
      startDate || endDate
        ? {
            created_at: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          }
        : {};

    const [
      totalRegistered,
      adminActivations,
      deactivatedIds,
      normalActivations,
    ] = await Promise.all([
      // Total users registered in date range
      User.countDocuments({
        ...userDateMatch,
      }),

      // Activated by Admin (Admin Activations)
      User.countDocuments({
        ...userDateMatch,
        status_notes: "Activated by Admin",
      }),

      // Deactivated by Admin (Blocked)
      User.countDocuments({
        ...userDateMatch,
        status_notes: "Deactivated by Admin",
      }),

      // Active users NOT activated by admin (Normal Activations)
      User.countDocuments({
        ...userDateMatch,
        user_status: "active",
        $or: [
          { status_notes: { $exists: false } },
          { status_notes: { $ne: "Activated by Admin" } },
        ],
      }),
    ]);

    /* =====================================================
       💰 PAYOUTS (DAILY + WEEKLY)
       Uses created_at + totalamount
    ===================================================== */
    const payoutDateMatch =
      startDate || endDate
        ? {
            created_at: {
              ...(startDate && { $gte: startDate }),
              ...(endDate && { $lte: endDate }),
            },
          }
        : {};

    const dailyAgg = await DailyPayout.aggregate([
      { $match: payoutDateMatch },
      {
        $group: {
          _id: null,
          totalPayout: { $sum: "$totalamount" },
          releasedPayout: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed|pending)$/i,
                  },
                },
                "$totalamount",
                0,
              ],
            },
          },
          holdPayout: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$totalamount",
                0,
              ],
            },
          },
          rewardPoints: { $sum: "$reward_amount" },
          releasedRewardPoints: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed|pending)$/i,
                  },
                },
                "$reward_amount",
                0,
              ],
            },
          },
          holdRewardPoints: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$reward_amount",
                0,
              ],
            },
          },

          holdPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          pendingPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(pending)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          releasedPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          totalWithdraw: { $sum: "$withdraw_amount" },
          totalAdminCharge: { $sum: "$admin_charge" },
          totalTds: { $sum: "$tds_amount" },
          totalPayable: { $sum: "$amount" },
        },
      },
    ]);

    const weeklyAgg = await WeeklyPayout.aggregate([
      { $match: payoutDateMatch },
      {
        $group: {
          _id: null,
          totalPayout: { $sum: "$amount" }, // ✅ FIXED

          releasedPayout: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed|pending)$/i,
                  },
                },
                "$amount", // ✅ FIXED
                0,
              ],
            },
          },

          holdPayout: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$amount", // ✅ FIXED
                0,
              ],
            },
          },

          rewardPoints: { $sum: "$reward_amount" },

          releasedRewardPoints: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed|pending)$/i,
                  },
                },
                "$reward_amount",
                0,
              ],
            },
          },

          holdRewardPoints: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$reward_amount",
                0,
              ],
            },
          },

          holdPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(onhold|on hold|hold|failed)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          pendingPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(pending)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          releasedPayable: {
            $sum: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: ["$status", ""] },
                    regex: /^(completed)$/i,
                  },
                },
                "$withdraw_amount",
                0,
              ],
            },
          },
          totalWithdraw: { $sum: "$withdraw_amount" },
          totalAdminCharge: { $sum: "$admin_charge" },
          totalTds: { $sum: "$tds_amount" },
          totalPayable: { $sum: "$amount" },
        },
      },
    ]);

    // console.log(dailyAgg,weeklyAgg)

    // existing
    const totalGeneratedPayout =
      (dailyAgg[0]?.totalPayout || 0) + (weeklyAgg[0]?.totalPayout || 0);
    const totalReleasedPayout =
      (dailyAgg[0]?.releasedPayout || 0) + (weeklyAgg[0]?.releasedPayout || 0);
    const totalHoldPayout =
      (dailyAgg[0]?.holdPayout || 0) + (weeklyAgg[0]?.holdPayout || 0);
    const generatedRewardPoints =
      (dailyAgg[0]?.rewardPoints || 0) + (weeklyAgg[0]?.rewardPoints || 0);
    const releasedRewardPoints =
      (dailyAgg[0]?.releasedRewardPoints || 0) +
      (weeklyAgg[0]?.releasedRewardPoints || 0);
    const holdRewardPoints =
      (dailyAgg[0]?.holdRewardPoints || 0) +
      (weeklyAgg[0]?.holdRewardPoints || 0);
    const totalWithdraw =
      (dailyAgg[0]?.totalWithdraw || 0) + (weeklyAgg[0]?.totalWithdraw || 0);
    const totalAdminCharge =
      (dailyAgg[0]?.totalAdminCharge || 0) +
      (weeklyAgg[0]?.totalAdminCharge || 0);
    const totalTds =
      (dailyAgg[0]?.totalTds || 0) + (weeklyAgg[0]?.totalTds || 0);
    const totalPayable =
      (dailyAgg[0]?.totalPayable || 0) + (weeklyAgg[0]?.totalPayable || 0);

    // 🆕 status-wise withdraw (payable) breakdown
    const holdPayable =
      (dailyAgg[0]?.holdPayable || 0) + (weeklyAgg[0]?.holdPayable || 0);
    const pendingPayable =
      (dailyAgg[0]?.pendingPayable || 0) + (weeklyAgg[0]?.pendingPayable || 0);
    const releasedPayable =
      (dailyAgg[0]?.releasedPayable || 0) +
      (weeklyAgg[0]?.releasedPayable || 0);

    const round2 = (num: any) => Number(Math.round(num).toFixed(2));
    /* =====================================================
       📤 RESPONSE
    ===================================================== */
    return NextResponse.json(
      {
        success: true,
        data: {
          sales: {
            totalSales: round2(totalSales),
            firstOrder: round2(firstOrderAgg[0]?.total),
            reorder: round2(reorderAgg[0]?.total),
            advanceSales: round2(advanceSales),
          },
          orders: {
            totalOrders: totalOrdersCount,
            pendingOrders: pendingCount,
            dispatchedOrders: dispatchedCount,
            deliveredOrders: deliveredCount,
            returnedOrders: returnedCount,
          },
          team: {
            totalRegistered,
            adminActivations,
            normalActivations,
            deactivatedIds,
          },
          wallet: {
            totalGeneratedPayout,
            totalReleasedPayout,
            totalHoldPayout,
            generatedRewardPoints,
            releasedRewardPoints,
            holdRewardPoints,
            totalWithdraw: round2(totalWithdraw),
            totalAdminCharge: round2(totalAdminCharge),
            totalTds: round2(totalTds),
            totalPayable: round2(totalPayable),
            holdPayable: round2(holdPayable),
            pendingPayable: round2(pendingPayable),
            releasedPayable: round2(releasedPayable),
          },
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 },
    );
  }
}
