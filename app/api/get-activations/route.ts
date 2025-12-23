import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/order";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const role = searchParams.get("role");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    /* ---------------- BASE QUERY ---------------- */

    const baseQuery: any = {
      // ✅ ACTIVATION ONLY
      $expr: {
        $ne: ["$placed_by.user_id", "$beneficiary.user_id"],
      },
    };

    // 👤 NORMAL USER → only activations placed by him
    if (role === "user") {
      if (!user_id) {
        return NextResponse.json(
          { success: false, message: "user_id required", data: [] },
          { status: 400 }
        );
      }

      baseQuery["placed_by.user_id"] = user_id;
    }

    // 👑 ADMIN → all activations (no extra filter)

    /* ---------------- SEARCH FILTER ---------------- */
    const conditions: any[] = [];

    if (search) {
      const regex = new RegExp("^" + search, "i");

      conditions.push({
        $or: [
          { order_id: regex },
          { user_id: regex },
          { user_name: regex },
          { contact: regex },
          { mail: regex },
          { payment_id: regex },
          { payment_date: regex },
        ],
      });
    }

    /* ---------------- DATE FILTER ---------------- */
    if (date && !from && !to) {
      conditions.push({ payment_date: date });
    }

    if (from && to) {
      conditions.push({
        payment_date: { $gte: from, $lte: to },
      });
    }

    /* ---------------- FINAL QUERY ---------------- */
    const finalQuery =
      conditions.length > 0
        ? { $and: [baseQuery, ...conditions] }
        : baseQuery;

    const orders = await Order.find(finalQuery).sort({
      created_at: -1,
    });

    return NextResponse.json(
      { success: true, data: orders },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("GET activations error:", error);
    return NextResponse.json(
      { success: false, message: error.message, data: [] },
      { status: 500 }
    );
  }
}
