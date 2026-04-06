// wallet-change-requests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { WalletChangeRequest } from "@/models/walletChangeRequest";

function parseDate(input: string | null): Date | null {
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

function toStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

function toEndOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const status  = searchParams.get("status");
    const user_id = searchParams.get("user_id");
    const search  = searchParams.get("search");
    const date    = searchParams.get("date");
    const from    = searchParams.get("from");
    const to      = searchParams.get("to");

    const baseQuery: any = {};
    if (status)  baseQuery.status  = status;
    if (user_id) baseQuery.user_id = user_id;

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
            { request_id:     regex },
            { wallet_id:      regex },
            { user_id:        regex },
            { status:         regex },
            { requested_role: regex }
          );
        });
        conditions.push({ $or: orConditions });
      }
    }

    if (date && !from && !to) {
      const parsed = parseDate(date);
      if (parsed) {
        conditions.push({
          created_at: {
            $gte: toStartOfDay(parsed),
            $lte: toEndOfDay(parsed),
          },
        });
      }
    }

    if (from || to) {
      const startDate = parseDate(from);
      const endDate   = parseDate(to);
      const rangeFilter: any = {};
      if (startDate) rangeFilter.$gte = toStartOfDay(startDate);
      if (endDate)   rangeFilter.$lte = toEndOfDay(endDate);
      if (Object.keys(rangeFilter).length) {
        conditions.push({ created_at: rangeFilter });
      }
    }

    const finalQuery =
      conditions.length > 0
        ? { $and: [baseQuery, ...conditions] }
        : baseQuery;

    const requests = await WalletChangeRequest.find(finalQuery).sort({
      created_at: -1,
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    console.error("🔥 GET WALLET-CHANGE-REQUESTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}



export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { request_id, new_values } = body;

    if (!request_id || !new_values) {
      return NextResponse.json(
        { success: false, message: "request_id and new_values are required" },
        { status: 400 }
      );
    }

    const changeRequest = await WalletChangeRequest.findOne({ request_id });

    if (!changeRequest) {
      return NextResponse.json(
        { success: false, message: "Request not found" },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot update a request that is already processed",
        },
        { status: 400 }
      );
    }

    changeRequest.new_values = new_values;
    changeRequest.updated_at = new Date();
    await changeRequest.save();

    return NextResponse.json({
      success: true,
      message: "Request updated successfully",
      data:    changeRequest,
    });
  } catch (error: any) {
    console.error("🔥 PUT WALLET-CHANGE-REQUESTS ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}