import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { WeeklyPayout } from "@/models/payout";
import mongoose from "mongoose";

// POST - Create new weekly payout
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const newPayout = await WeeklyPayout.create(body);
    return NextResponse.json({ success: true, data: newPayout }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}


export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // ✅ Fetch by ID or transaction_id
    if (id) {
      let payout;
      if (mongoose.Types.ObjectId.isValid(id)) {
        payout = await WeeklyPayout.findById(id);
      } else {
        payout = await WeeklyPayout.findOne({ transaction_id: id });
      }

      if (!payout) {
        return NextResponse.json(
          { success: false, message: "Payout not found", data: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: [payout] }, { status: 200 });
    }

    // ✅ Role-based query setup
    let baseQuery: any = {};
    if (role) {
      if (role === "user") {
        if (!user_id) {
          return NextResponse.json(
            { success: false, message: "user_id is required for role=user", data: [] },
            { status: 400 }
          );
        }
        baseQuery.user_id = user_id;
      } else if (role === "admin") {
        baseQuery = {}; // all records
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid role", data: [] },
          { status: 400 }
        );
      }
    }

    // ✅ Helper to parse DD-MM-YYYY / YYYY-MM-DD
    const parseDate = (input: string | null) => {
      if (!input) return null;
      input = input.trim();

      let match = input.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      match = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    };

    // ✅ Build filters
    const conditions: any[] = [];

    // Search filter
    if (search) {
      const searchTerms = search.split(",").map(s => s.trim()).filter(Boolean);
      if (searchTerms.length) {
        const searchConditions = searchTerms.flatMap(term => {
          const regex = new RegExp("^" + term, "i");
          const conds: any[] = [
            { transaction_id: regex },
            { user_id: regex },
            { user_name: regex },
            { status: regex },
            { details: regex }
          ];
          if (!isNaN(Number(term))) {
            conds.push({ $expr: { $eq: [{ $floor: "$amount" }, Number(term)] } });
          }
          return conds;
        });
        conditions.push({ $or: searchConditions });
      }
    }

    // Single date filter
    if (date && !from && !to) {
      const parsedDate = parseDate(date);
      if (parsedDate) {
        const formatted = `${("0" + parsedDate.getDate()).slice(-2)}-${(
          "0" +
          (parsedDate.getMonth() + 1)
        ).slice(-2)}-${parsedDate.getFullYear()}`;
        conditions.push({ date: formatted });
      }
    }

    // Date range filter
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);
      if (startDate && endDate) {
        const startFormatted = `${("0" + startDate.getDate()).slice(-2)}-${(
          "0" +
          (startDate.getMonth() + 1)
        ).slice(-2)}-${startDate.getFullYear()}`;
        const endFormatted = `${("0" + endDate.getDate()).slice(-2)}-${(
          "0" +
          (endDate.getMonth() + 1)
        ).slice(-2)}-${endDate.getFullYear()}`;
        conditions.push({ date: { $gte: startFormatted, $lte: endFormatted } });
      }
    }

    // ✅ Final query
    const finalQuery =
      conditions.length > 0 ? { $and: [baseQuery, ...conditions] } : baseQuery;

    const payouts = await WeeklyPayout.find(finalQuery).sort({ date: -1 });

    return NextResponse.json({ success: true, data: payouts }, { status: 200 });
  } catch (error: any) {
    console.error("GET weekly payout error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}


// PUT, PATCH, DELETE are same as daily, just replace DailyPayout with WeeklyPayout
// You can copy PUT, PATCH, DELETE blocks from dailyPayout-operations/route.ts and replace model
