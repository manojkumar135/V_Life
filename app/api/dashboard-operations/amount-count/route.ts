import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    const role = searchParams.get("role") || "user"; // 'admin' or 'user'

    if (!user_id && role !== "admin") {
      return NextResponse.json(
        { success: false, message: "User ID required for non-admin" },
        { status: 400 }
      );
    }

    // 🔍 Filter: admin sees all, user sees own
    const filter = role === "admin" ? {} : { user_id };

    // Fetch relevant records
    const records = await History.find(filter, {
      transaction_type: 1,
      amount: 1,
      tds_amount: 1,
      status: 1,
    }).lean();

    if (!records?.length) {
      return NextResponse.json(
        { success: true, data: { purchases: 0, income: 0, tax: 0 } },
        { status: 200 }
      );
    }

    let purchases = 0;
    let income = 0;
    let tax = 0;

    // 🔄 Apply role-based logic
    records.forEach((r) => {
      if (r.status !== "Completed") return;

      // 🧾 Common tax addition
      tax += r.tds_amount || 0;

      if (role === "admin") {
        // For admin: reverse logic
        if (r.transaction_type === "Credit") purchases += r.amount || 0; // user paid → admin received
        if (r.transaction_type === "Debit") income += r.amount || 0; // admin paid user
      } else {
        // For normal user
        if (r.transaction_type === "Debit") purchases += r.amount || 0; // user spent
        if (r.transaction_type === "Credit") income += r.amount || 0; // user earned
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: { purchases, income, tax },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error in amount-count route:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Server error" },
      { status: 500 }
    );
  }
}
