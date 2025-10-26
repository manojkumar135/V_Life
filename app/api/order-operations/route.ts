import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Order } from "@/models/order";
import { User } from "@/models/user";
import { History } from "@/models/history";

import { generateUniqueCustomId } from "@/utils/server/customIdGenerator";

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
}

// ----------------- POST -----------------

export async function POST(request: Request) {
  try {
    await connectDB();
    const body: OrderPayload = await request.json();

    // Generate unique order_id with prefix "OR"
    const order_id = await generateUniqueCustomId("OR", Order, 8, 8);

    // Calculate total amount using dealer_price * quantity
    const amount =
      body.amount ??
      body.items.reduce(
        (sum, item) =>
          sum + (item.dealer_price || item.unit_price) * item.quantity,
        0
      );

    // Calculate total BV from items
    const totalBV = body.items.reduce(
      (sum, item) => sum + (item.bv || 0) * item.quantity,
      0
    );

    // -------------------
    // 1️⃣ Create the Order first
    // -------------------
    const newOrder = await Order.create({ ...body, order_id, amount });

    // -------------------
    // 2️⃣ Create History record AFTER order creation
    // -------------------
    const user = await User.findOne({ user_id: body.user_id });
    if (user) {
      await History.create({
        transaction_id: body.payment_id,
        wallet_id: user.wallet_id || "",
        user_id: user.user_id,
        user_name: user.user_name,
        rank: user.rank,
        order_id: newOrder.order_id,
        account_holder_name: user.user_name,
        bank_name: "Razorpay",
        account_number: "N/A",
        ifsc_code: "N/A",
        date: new Date()
          .toISOString()
          .split("T")[0]
          .split("-")
          .reverse()
          .join("-"),
        time: new Date().toLocaleTimeString(),
        available_balance: user.wallet_balance || 0,
        amount,
        transaction_type: "Debit",
        details: body.is_first_order
          ? "Order Payment (₹10,000 Advance Deducted)"
          : "Order Payment",
        status: "Completed",
        created_by: user.user_id,
      });

      // -------------------
      // 3️⃣ Update user BV after history
      // -------------------
      user.bv = (user.bv || 0) + totalBV;
      await user.save();
    }

    return NextResponse.json(
      { success: true, data: newOrder, addedBV: totalBV },
      { status: 201 }
    );
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

    const orders = await Order.find(finalQuery).sort({ payment_date: -1 });

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
