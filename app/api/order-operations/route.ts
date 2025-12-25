//api/order-operations/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";

import { addRewardScore } from "@/services/updateRewardScore";
import { useRewardScore } from "@/services/useRewardScore";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";
import { activateUser } from "@/services/userActivation";
import { checkAndUpgradeRank } from "@/services/rankEngine";

import {
  updateInfinityTeam,
  propagateInfinityUpdateToAncestors,
} from "@/services/infinity";

// ----------------- Types -----------------
interface OrderItem {
  product_id: string;
  product: string;
  category: string;
  name: string;
  quantity: number;
  unit_price: number;
  price: number;
  mrp?: number;
  dealer_price?: number;
  bv?: number;
  pv?: number;
  description?: string;
  image?: string;
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
}

interface OrderPayload {
  id?: string;
  order_id?: string;
  user_id: string;
  user_name: string;
  contact: string;
  mail: string;
  address: string;
  payment_date: string;
  amount?: number;
  final_amount: number;
  items: OrderItem[];
  created_at?: Date;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: Date;
  order_status?: string;
  description?: string;
  payment_id?: string;
  payment_type?: string;
  is_first_order?: boolean;
  reward_used?: number;
  reward_remaining?: number;
  payable_amount?: number;

  /* ✅ ADD THESE */
  placed_by?: {
    user_id: string;
    name?: string;
    contact?: string;
    mail?: string;
  };

  beneficiary?: {
    user_id: string;
    name?: string;
    contact?: string;
    mail?: string;
    address?: string;
  };

  reward_usage: {
    cashback: {
      before: number;
      used: number;
      after: number;
    };
    fortnight: {
      before: number;
      used: number;
      after: number;
    };
  };
}

// ----------------- POST -----------------
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    /* ---------------- NORMALIZE OPTIONAL FIELDS ---------------- */
    const rewardUsed = Number(body.reward_used ?? 0);
    const rewardRemaining = Number(body.reward_remaining ?? 0);

    /* ============================================================
       🔑 IDENTIFY BENEFICIARY & PLACED BY (CRITICAL FIX)
    ============================================================ */
    const beneficiaryId = body.beneficiary?.user_id || body.user_id;

    const placedById = body.placed_by?.user_id || body.user_id;

    /* ---------------- FETCH USERS ---------------- */
    const [beneficiary, placedBy, hasCompletedOrder] = await Promise.all([
      User.findOne({ user_id: beneficiaryId }),
      User.findOne({ user_id: placedById }),
      Order.exists({
        user_id: beneficiaryId,
        payment: "completed",
        order_status: { $ne: "cancelled" },
      }),
    ]);

    if (!beneficiary || !placedBy) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ FINAL isFirstOrder logic
    const isFirstOrder =
      beneficiary.user_status !== "active" && !hasCompletedOrder;

    const adminActivated =
      beneficiary.status_notes?.toLowerCase().includes("admin") ?? false;

    const shouldTriggerMLM = isFirstOrder && !adminActivated;

    /* ---------------- SAFETY: OTHER ORDER ---------------- */
    if (body.order_mode === "OTHER" && body.items?.length !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Activation order must contain exactly one product",
        },
        { status: 400 }
      );
    }

    /* ---------------- GENERATE ORDER ID ---------------- */
    const order_id = await generateUniqueCustomId("OR", Order, 8, 8);

    /* ---------------- CALCULATE AMOUNT ---------------- */
    const amount =
      body.amount ??
      body.items.reduce(
        (sum: number, item: any) =>
          sum + (item.dealer_price || item.unit_price) * item.quantity,
        0
      );

    /* ---------------- CALCULATE BV / PV ---------------- */
    const totalBV = body.items.reduce(
      (sum: number, item: any) => sum + (item.bv || 0) * item.quantity,
      0
    );

    const totalPV = body.items.reduce(
      (sum: number, item: any) => sum + (item.pv || 0) * item.quantity,
      0
    );

    /* ---------------- 1️⃣ CREATE ORDER ---------------- */
    const newOrder = await Order.create({
      ...body,
      order_id,
      user_id: beneficiary.user_id, // ✅ beneficiary owns order
      amount,
    });

    /* ---------------- 2️⃣ CREATE HISTORY (PLACED BY) ---------------- */
    await History.create({
      transaction_id: body.payment_id || newOrder.order_id,
      wallet_id: beneficiary.wallet_id || "",
      user_id: beneficiary.user_id,
      user_name: beneficiary.user_name,
      contact: beneficiary.contact || "",
      mail: beneficiary.mail || "",
      user_status: beneficiary.user_status || "inactive",
      pan_verified: beneficiary.pan_verified || false,
      rank: beneficiary.rank,
      order_id: newOrder.order_id,

      placed_by: placedBy.user_id,
      placed_by_name: placedBy.user_name,

      account_holder_name: placedBy.user_name,
      bank_name: "Razorpay",
      account_number: "N/A",
      ifsc_code: "N/A",

      date: newOrder.payment_date,
      time: newOrder.payment_time,

      available_balance: beneficiary.wallet_balance || 0,
      transaction_type: "Debit",
      status: "Completed",

      amount: body.payable_amount,
      payable_amount: body.payable_amount,
      base_amount: body.amount,

      reward_used: rewardUsed,
      reward_remaining: rewardRemaining,

      first_order: isFirstOrder,
      first_payment: isFirstOrder,
      advance: false,

      details:
        beneficiary.user_id === placedBy.user_id
          ? "Order Payment"
          : `Order placed by ${placedBy.user_id}`,
      created_by: placedBy.user_id,
    });

    /* ---------------- 3️⃣ UPDATE BV / PV (BENEFICIARY) ---------------- */
    beneficiary.bv = (beneficiary.bv || 0) + totalBV;
    beneficiary.pv = (beneficiary.pv || 0) + totalPV;
    beneficiary.self_bv = (beneficiary.self_bv || 0) + totalBV;
    beneficiary.self_pv = (beneficiary.self_pv || 0) + totalPV;

    /* ---------------- REWARD DEDUCTION (PLACED BY) ---------------- */
    const rewardUsage = body.reward_usage;
    const rewardOwnerId = placedBy.user_id;

    if (rewardUsage?.cashback?.used > 0) {
      await useRewardScore({
        user_id: rewardOwnerId,
        points: rewardUsage.cashback.used,
        module: "order",
        reference_id: newOrder.order_id,
        remarks: `Cashback used for order ${newOrder.order_id}`,
        type: "cashback",
      });
    }

    if (rewardUsage?.fortnight?.used > 0) {
      await useRewardScore({
        user_id: rewardOwnerId,
        points: rewardUsage.fortnight.used,
        module: "order",
        reference_id: newOrder.order_id,
        remarks: `Fortnight reward used for order ${newOrder.order_id}`,
        type: "fortnight",
      });
    }

    /* ---------------- 🎁 REWARD EARNING (BENEFICIARY) ---------------- */
    if (isFirstOrder && beneficiary.user_status !== "active") {
      const cashbackPoints = 2 * newOrder.amount;

      if (cashbackPoints > 0) {
        await addRewardScore({
          user_id: beneficiary.user_id,
          points: cashbackPoints,
          source: "order",
          reference_id: newOrder.order_id,
          remarks: `Cashback for first order ${newOrder.order_id}`,
          type: "cashback",
        });
      }
    } else {
      const dailyPoints = 10 * totalPV;

      if (dailyPoints > 0) {
        await addRewardScore({
          user_id: beneficiary.user_id,
          points: dailyPoints,
          source: "order",
          reference_id: newOrder.order_id,
          remarks: `Cashback reward for order ${newOrder.order_id}`,
          type: "cashback",
        });
      }
    }

    /* ---------------- ACTIVATE BENEFICIARY (AS REQUESTED) ---------------- */
    let justActivated = false;

    if (isFirstOrder && beneficiary.user_status !== "active") {
      await beneficiary.save();
      await activateUser(beneficiary); // does NOT save
      await beneficiary.save();
      justActivated = true;
    } else {
      await beneficiary.save();
    }

    /* ---------------- RELOAD BENEFICIARY ---------------- */
    const freshUser = await User.findOne({
      user_id: beneficiary.user_id,
    });

    /* ---------------- FAST RESPONSE ---------------- */
    const response = NextResponse.json(
      { success: true, data: newOrder, addedBV: totalBV },
      { status: 201 }
    );

    /* ---------------- BACKGROUND MLM ---------------- */
    void (async () => {
      try {
        if (!freshUser?.referBy) return;

        const referrerId = freshUser.referBy;

        if (justActivated) {
          await User.updateOne(
            { user_id: referrerId },
            {
              $addToSet: { paid_directs: freshUser.user_id },
              $inc: { paid_directs_count: 1 },
            }
          );
        }

        if (shouldTriggerMLM) {
          await updateInfinityTeam(referrerId);
          await propagateInfinityUpdateToAncestors(referrerId);

          const referrer = await User.findOne({ user_id: referrerId });
          if (referrer) {
            await checkAndUpgradeRank(referrer);
          }
        }

        await User.updateOne(
          { user_id: referrerId },
          { $inc: { direct_bv: totalBV, direct_pv: totalPV } }
        );
      } catch (err) {
        console.error("❌ [BG] Infinity / Rank error", err);
      }
    })();

    /* ---------------- ADMIN ALERT ---------------- */
    await Alert.create({
      user_id: placedBy.user_id,
      user_contact: placedBy.contact || "",
      user_email: placedBy.mail || "",
      user_status: placedBy.user_status || "active",
      title: "New Order Placed",
      description: `Order ${newOrder.order_id} placed for ${beneficiary.user_id}`,
      role: "admin",
      link: "/orders",
      related_id: newOrder.order_id,
      alert_type: "success",
      date: new Date().toLocaleDateString("en-GB").split("/").join("-"),
      priority: "high",
      delivered_via: "system",
    });

    return response;
  } catch (error: any) {
    console.error("🔥 [ORDER] Fatal error", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- GET -----------------
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("order_id");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // -------------------
    // Lookup by ID or order_id
    // -------------------
    if (id) {
      let order;
      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await Order.findById(id);
      } else {
        order = await Order.findOne({ order_id: id });
      }

      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found", data: [] },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, data: [order] },
        { status: 200 }
      );
    }

    // -------------------
    // Role-based query
    // -------------------
    let baseQuery: Record<string, any> = {};
    if (role) {
      if (role === "user") {
        if (!user_id) {
          return NextResponse.json(
            {
              success: false,
              message: "user_id is required for role=user",
              data: [],
            },
            { status: 400 }
          );
        }
        baseQuery.user_id = user_id;
      } else if (role === "admin") {
        baseQuery = {};
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid role", data: [] },
          { status: 400 }
        );
      }
    }

    // -------------------
    // Date parsing helper
    // -------------------
    function parseDate(input: string | null) {
      if (!input) return null;
      input = input.trim();

      // dd-mm-yyyy or dd/mm/yyyy
      let match = input.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [_, day, month, year] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // yyyy-mm-dd or yyyy/mm/dd
      match = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        const [_, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // fallback
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    // -------------------
    // Build filter conditions
    // -------------------
    const conditions: any[] = [];

    // Search filter
    if (search) {
      const searchTerms = search
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (searchTerms.length) {
        const searchConditions = searchTerms.flatMap((term) => {
          const regex = new RegExp("^" + term, "i");
          const conds: any[] = [
            { order_id: regex },
            { user_id: regex },
            { user_name: regex },
            { contact: regex },
            { mail: regex },
            { product_id: regex },
            { payment_id: regex },
            { payment_date: regex },
            { shipping_address: regex },
            { order_status: regex },
          ];
          if (!isNaN(Number(term))) {
            const num = Number(term);
            conds.push({ $expr: { $eq: [{ $floor: "$amount" }, num] } });
          }
          return conds;
        });

        conditions.push({ $or: searchConditions });
      }
    }

    // Single date filter (assume payment_date stored as "dd-mm-yyyy" string like history)
    if (date && !from && !to) {
      const parsedDate = parseDate(date);
      if (parsedDate) {
        const day = ("0" + parsedDate.getDate()).slice(-2);
        const month = ("0" + (parsedDate.getMonth() + 1)).slice(-2);
        const year = parsedDate.getFullYear();
        const formatted = `${day}-${month}-${year}`; // dd-mm-yyyy
        conditions.push({ payment_date: formatted });
      }
    }

    // Date range filter
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);

      if (startDate && endDate) {
        const startDay = ("0" + startDate.getDate()).slice(-2);
        const startMonth = ("0" + (startDate.getMonth() + 1)).slice(-2);
        const startYear = startDate.getFullYear();

        const endDay = ("0" + endDate.getDate()).slice(-2);
        const endMonth = ("0" + (endDate.getMonth() + 1)).slice(-2);
        const endYear = endDate.getFullYear();

        const startFormatted = `${startDay}-${startMonth}-${startYear}`;
        const endFormatted = `${endDay}-${endMonth}-${endYear}`;

        conditions.push({
          payment_date: { $gte: startFormatted, $lte: endFormatted },
        });
      }
    }

    // -------------------
    // Combine baseQuery with conditions
    // -------------------
    const finalQuery =
      conditions.length > 0 ? { $and: [baseQuery, ...conditions] } : baseQuery;

    const orders = await Order.find(finalQuery).sort({
      // last_modified_at: -1,
      created_at: -1,
    });
    // console.log(orders);

    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error: any) {
    console.error("GET order error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}

// ----------------- PUT -----------------
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, order_id, ...rest }: OrderPayload = await request.json();
    const updateId = id || order_id;

    if (!updateId) {
      return NextResponse.json(
        { success: false, message: "ID or order_id is required" },
        { status: 400 }
      );
    }

    let updatedOrder;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedOrder = await Order.findByIdAndUpdate(updateId, rest, {
        new: true,
      });
    } else {
      updatedOrder = await Order.findOneAndUpdate(
        { order_id: updateId },
        rest,
        { new: true }
      );
    }

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: updatedOrder },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// ----------------- DELETE -----------------
export async function DELETE(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const orderIdParam = searchParams.get("order_id");

    let deletedOrder;

    if (orderIdParam && mongoose.Types.ObjectId.isValid(orderIdParam)) {
      deletedOrder = await Order.findByIdAndDelete(orderIdParam);
    } else if (orderIdParam) {
      deletedOrder = await Order.findOneAndDelete({ order_id: orderIdParam });
    } else if (idParam && mongoose.Types.ObjectId.isValid(idParam)) {
      deletedOrder = await Order.findByIdAndDelete(idParam);
    }

    if (!deletedOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Order deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
