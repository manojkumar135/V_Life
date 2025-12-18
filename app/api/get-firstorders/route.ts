import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    /* =======================
       QUERY PARAMS
    ======================= */
    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const role = searchParams.get("role");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    /* =======================
       1️⃣ FETCH BY ID / TRANSACTION ID
    ======================= */
    if (id) {
      let history;

      if (mongoose.Types.ObjectId.isValid(id)) {
        history = await History.findById(id);
      } else {
        history = await History.findOne({ transaction_id: id });
      }

      if (!history) {
        return NextResponse.json(
          { success: false, message: "Record not found", data: [] },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: true, data: [history] },
        { status: 200 }
      );
    }

    /* =======================
       2️⃣ BASE QUERY — FIRST ORDER HISTORY ONLY
    ======================= */
    const baseQuery: any = {
      first_order: true,
      first_payment: true,
      advance: false,
      details: "Order Payment",
      status: "Completed",
    };

    /* =======================
       3️⃣ ROLE FILTERING
    ======================= */
    if (!role) {
      return NextResponse.json(
        { success: false, message: "role is required", data: [] },
        { status: 400 }
      );
    }

    if (role === "user") {
      if (!user_id) {
        return NextResponse.json(
          { success: false, message: "user_id required for role=user", data: [] },
          { status: 400 }
        );
      }
      baseQuery.user_id = user_id;
    }

    /* =======================
       4️⃣ SEARCH FILTER
    ======================= */
    const conditions: any[] = [];

    if (search) {
      const terms = search
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      if (terms.length) {
        const orConditions: any[] = [];

        terms.forEach((term) => {
          const regex = new RegExp("^" + term, "i");

          orConditions.push(
            { transaction_id: regex },
            { order_id: regex },
            { user_id: regex },
            { user_name: regex },
            { status: regex },
            { details: regex },
            { date: regex }
          );

          if (!isNaN(Number(term))) {
            orConditions.push({
              $expr: {
                $eq: [{ $floor: "$amount" }, Number(term)],
              },
            });
          }
        });

        conditions.push({ $or: orConditions });
      }
    }

    /* =======================
       5️⃣ DATE PARSER (UNCHANGED)
    ======================= */
    function parseDate(input: string | null) {
      if (!input) return null;
      input = input.trim();

      let match = input.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [, d, m, y] = match;
        return new Date(Number(y), Number(m) - 1, Number(d));
      }

      match = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        const [, y, m, d] = match;
        return new Date(Number(y), Number(m) - 1, Number(d));
      }

      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    /* =======================
       6️⃣ SINGLE DATE FILTER
    ======================= */
    if (date && !from && !to) {
      const parsed = parseDate(date);
      if (parsed) {
        const dd = String(parsed.getDate()).padStart(2, "0");
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const yyyy = parsed.getFullYear();

        conditions.push({ date: `${dd}-${mm}-${yyyy}` });
      }
    }

    /* =======================
       7️⃣ DATE RANGE FILTER
    ======================= */
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);

      if (startDate && endDate) {
        const fromDate = `${String(startDate.getDate()).padStart(2, "0")}-${String(
          startDate.getMonth() + 1
        ).padStart(2, "0")}-${startDate.getFullYear()}`;

        const toDate = `${String(endDate.getDate()).padStart(2, "0")}-${String(
          endDate.getMonth() + 1
        ).padStart(2, "0")}-${endDate.getFullYear()}`;

        conditions.push({
          date: { $gte: fromDate, $lte: toDate },
        });
      }
    }

    /* =======================
       8️⃣ FINAL QUERY
    ======================= */
    const finalQuery =
      conditions.length > 0
        ? { $and: [baseQuery, ...conditions] }
        : baseQuery;

    /* =======================
       9️⃣ FETCH FIRST ORDER HISTORY
    ======================= */
    const histories = await History.find(finalQuery).sort({
      created_at: -1,
    });

    return NextResponse.json(
      { success: true, data: histories },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 GET FIRST ORDER HISTORY ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message ?? "Server Error",
        data: [],
      },
      { status: 500 }
    );
  }
}
