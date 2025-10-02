import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { DailyPayout } from "@/models/payout";
import mongoose from "mongoose";

// POST - Create new daily payout
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();
    const newPayout = await DailyPayout.create(body);
    return NextResponse.json({ success: true, data: newPayout }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET - Fetch daily payouts
export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const user_id = searchParams.get("user_id");
    const role = searchParams.get("role");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // ✅ If specific payout id is provided
    if (id) {
      let payout;
      if (mongoose.Types.ObjectId.isValid(id)) {
        payout = await DailyPayout.findById(id);
      } else {
        payout = await DailyPayout.findOne({ transaction_id: id });
      }

      if (!payout) {
        return NextResponse.json(
          { success: false, message: "Payout not found", data: [] },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: [payout] }, { status: 200 });
    }

    // ✅ Role-based query
    let baseQuery: any = {};
    if (role === "admin") {
      baseQuery = {}; // all records
    } else if (role === "user") {
      if (!user_id) {
        return NextResponse.json(
          { success: false, message: "user_id is required when role=user", data: [] },
          { status: 400 }
        );
      }
      baseQuery.user_id = user_id;
    } else {
      return NextResponse.json(
        { success: false, message: "Invalid or missing role", data: [] },
        { status: 400 }
      );
    }

    // ✅ Date parser helper
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

    // ✅ Build dynamic filters
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
        const formatted = `${("0" + parsedDate.getDate()).slice(-2)}-${("0" + (parsedDate.getMonth() + 1)).slice(-2)}-${parsedDate.getFullYear()}`;
        conditions.push({ date: formatted });
      }
    }

    // Date range filter
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);
      if (startDate && endDate) {
        const startFormatted = `${("0" + startDate.getDate()).slice(-2)}-${("0" + (startDate.getMonth() + 1)).slice(-2)}-${startDate.getFullYear()}`;
        const endFormatted = `${("0" + endDate.getDate()).slice(-2)}-${("0" + (endDate.getMonth() + 1)).slice(-2)}-${endDate.getFullYear()}`;
        conditions.push({ date: { $gte: startFormatted, $lte: endFormatted } });
      }
    }

    // ✅ Final query
    const finalQuery = conditions.length ? { $and: [baseQuery, ...conditions] } : baseQuery;
    const payouts = await DailyPayout.find(finalQuery).sort({ date: -1 });

    return NextResponse.json({ success: true, data: payouts }, { status: 200 });
  } catch (error: any) {
    console.error("GET daily payout error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error", data: [] },
      { status: 500 }
    );
  }
}

// PUT - Replace a daily payout
export async function PUT(request: Request) {
  try {
    await connectDB();
    const { id, transaction_id, ...rest } = await request.json();
    const updateId = id || transaction_id;

    if (!updateId) return NextResponse.json({ success: false, message: "ID or transaction_id is required" }, { status: 400 });

    let updatedPayout;
    if (mongoose.Types.ObjectId.isValid(updateId)) {
      updatedPayout = await DailyPayout.findByIdAndUpdate(updateId, rest, { new: true });
    } else {
      updatedPayout = await DailyPayout.findOneAndUpdate({ transaction_id: updateId }, rest, { new: true });
    }

    if (!updatedPayout) return NextResponse.json({ success: false, message: "Payout not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedPayout }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH - Partial update
export async function PATCH(request: Request) {
  try {
    await connectDB();
    const { id, transaction_id, ...updates } = await request.json();

    let updatedPayout;
    if (mongoose.Types.ObjectId.isValid(id || transaction_id)) {
      updatedPayout = await DailyPayout.findByIdAndUpdate(id || transaction_id, updates, { new: true });
    } else {
      updatedPayout = await DailyPayout.findOneAndUpdate({ transaction_id }, updates, { new: true });
    }

    if (!updatedPayout) return NextResponse.json({ success: false, message: "Payout not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedPayout }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE - Remove a daily payout
export async function DELETE(request: Request) {
  try {
    await connectDB();
    const { id, transaction_id } = await request.json();

    let deletedPayout;
    if (mongoose.Types.ObjectId.isValid(id || transaction_id)) {
      deletedPayout = await DailyPayout.findByIdAndDelete(id || transaction_id);
    } else {
      deletedPayout = await DailyPayout.findOneAndDelete({ transaction_id });
    }

    if (!deletedPayout) return NextResponse.json({ success: false, message: "Payout not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Payout deleted" }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
