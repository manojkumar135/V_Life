//api/order-operations/route.ts

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { History } from "@/models/history";
import { Alert } from "@/models/alert";

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
}

// ----------------- POST -----------------
export async function POST(request: Request) {
  try {
    await connectDB();
    const body: OrderPayload = await request.json();

    /* ---------------- NORMALIZE OPTIONAL FIELDS ---------------- */
    const rewardUsed = Number(body.reward_used ?? 0);
    const rewardRemaining = Number(body.reward_remaining ?? 0);

    /* ---------------- FETCH USER & ORDER STATUS ---------------- */
    const [hasOrder, user] = await Promise.all([
      Order.exists({ user_id: body.user_id }),
      User.findOne({ user_id: body.user_id }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const isFirstOrder = !hasOrder && user.user_status !== "active";

    /* ---------------- GENERATE ORDER ID ---------------- */
    const order_id = await generateUniqueCustomId("OR", Order, 8, 8);

    /* ---------------- CALCULATE AMOUNT ---------------- */
    const amount =
      body.amount ??
      body.items.reduce(
        (sum, item) =>
          sum + (item.dealer_price || item.unit_price) * item.quantity,
        0
      );

    /* ---------------- CALCULATE BV / PV ---------------- */
    const totalBV = body.items.reduce(
      (sum, item) => sum + (item.bv || 0) * item.quantity,
      0
    );

    const totalPV = body.items.reduce(
      (sum, item) => sum + (item.pv || 0) * item.quantity,
      0
    );

    /* ---------------- 1️⃣ CREATE ORDER ---------------- */
    const newOrder = await Order.create({
      ...body,
      order_id,
      amount,
    });

    /* ---------------- 2️⃣ CREATE HISTORY ---------------- */
    await History.create({
      // Ensure transaction_id exists (use payment_id when present, otherwise fallback to order_id)
      transaction_id: body.payment_id || newOrder.order_id,
      wallet_id: user.wallet_id || "",
      user_id: user.user_id,
      user_name: user.user_name,
      contact: user.contact || "",
      mail: user.mail || "",
      user_status: user.user_status || "active",
      pan_verified: user.pan_verified || false,
      rank: user.rank,
      order_id: newOrder.order_id,

      account_holder_name: user.user_name,
      bank_name: "Razorpay",
      account_number: "N/A",
      ifsc_code: "N/A",

      date: new Date().toLocaleDateString("en-GB").split("/").join("-"),
      time: new Date().toLocaleTimeString(),

      available_balance: user.wallet_balance || 0,
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

      details: rewardUsed > 0 ? "Order Payment (Reward Used)" : "Order Payment",

      created_by: user.user_id,
    });

    /* ---------------- 3️⃣ UPDATE USER BV / PV ---------------- */
    user.bv = (user.bv || 0) + totalBV;
    user.pv = (user.pv || 0) + totalPV;

    user.self_bv = (user.self_bv || 0) + totalBV;
    user.self_pv = (user.self_pv || 0) + totalPV;

    /* ---------------- REWARD DEDUCTION ---------------- */
    if (rewardUsed > 0) {
      const newBalance = Math.max(0, (user.reward || 0) - rewardUsed);
      user.reward = newBalance;

      user.reward_history.push({
        type: "debit",
        source: "order",
        reference_id: newOrder.order_id,
        used: rewardUsed,
        balance_after: newBalance,
        remarks: `Reward used for order ${newOrder.order_id}`,
      });
    }

    /* ---------------- ACTIVATE USER ON FIRST ORDER ---------------- */
    if (isFirstOrder && user.user_status !== "active") {
      await activateUser(user);
    } else {
      await user.save();
    }

    /* ---------------- FAST RESPONSE (VERY IMPORTANT) ---------------- */
    const response = NextResponse.json(
      { success: true, data: newOrder, addedBV: totalBV },
      { status: 201 }
    );

    /* ---------------- BACKGROUND TASKS (DO NOT AWAIT) ---------------- */
    setImmediate(async () => {
      try {
        if (!user.referBy) return;

        /* DIRECT BV */
        await User.updateOne(
          { user_id: user.referBy },
          { $inc: { direct_bv: totalBV, direct_pv: totalPV } }
        );

        /* INFINITY BV */
        if (user.infinity) {
          const infinitySponsor = await User.findOne({
            user_id: user.infinity,
          });

          if (infinitySponsor) {
            const rankPercentages: Record<string, number> = {
              "1": 0.25,
              "2": 0.35,
              "3": 0.4,
              "4": 0.45,
              "5": 0.5,
            };

            const pct =
              rankPercentages[String(infinitySponsor.rank || "1")] ?? 0;

            const infinityBV = totalBV * pct;

            if (infinityBV > 0) {
              await User.updateOne(
                { user_id: infinitySponsor.user_id },
                { $inc: { infinity_bv: infinityBV } }
              );
            }
          }
        }

        /* INFINITY TREE + RANK */
        await updateInfinityTeam(user.referBy);
        await propagateInfinityUpdateToAncestors(user.referBy);

        const referrer = await User.findOne({ user_id: user.referBy });
        if (!referrer) return;

        const oldRank = referrer.rank;
        await checkAndUpgradeRank(referrer);

        const updatedReferrer = await User.findOne({
          user_id: referrer.user_id,
        });

        if (updatedReferrer && updatedReferrer.rank !== oldRank) {
          await Alert.create({
            user_id: updatedReferrer.user_id,
            user_name: updatedReferrer.user_name || "",
            user_status: updatedReferrer.user_status,
            role: "user",
            priority: "high",
            title: "🎖️ Rank Achieved!",
            description: `Congratulations ${updatedReferrer.user_name}! You achieved Rank ${updatedReferrer.rank}.`,
            type: "achievement",
            link: "/dashboards",
            date: new Date().toLocaleDateString("en-GB").split("/").join("-"),
          });
        }
      } catch (err) {
        console.error("Background infinity / rank error:", err);
      }
    });

    /* ---------------- ADMIN ALERT ---------------- */
    await Alert.create({
      user_id: user.user_id,
      user_contact: user.contact || "",
      user_email: user.mail || "",
      user_status: user.user_status || "active",
      title: "New Order Placed",
      description: `A new order has been placed by user ID ${user.user_id}.`,
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
    console.error("Order creation error:", error);
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
