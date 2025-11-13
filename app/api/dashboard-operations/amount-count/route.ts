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

    // 🧩 Filter logic
    const filter = role === "admin" ? {} : { user_id };

    // Fetch records
    const records = await History.find(filter, {
      transaction_type: 1,
      amount: 1,
      tds_amount: 1,
      status: 1,
    }).lean();

    // console.log(records, user_id, role,records?.length);

    if (!records?.length) {
      return NextResponse.json(
        { success: true, data: { purchases: 0, income: 0, tax: 0 } },
        { status: 200 }
      );
    }

    let purchases = 0;
    let income = 0;
    let tax = 0;

    // 💰 Calculate based on role
    records.forEach((r) => {
      // if (r.status !== "Completed") return;

      tax += r.tds_amount || 0;

      if (role === "user") {
        // user: Credit = income, Debit = expense
        if (r.transaction_type === "Credit") income += r.amount || 0;
        if (r.transaction_type === "Debit") purchases += r.amount || 0;
      } else if (role === "admin") {
        // admin: Credit = expense, Debit = income
        if (r.transaction_type === "Credit") purchases += r.amount || 0;
        if (r.transaction_type === "Debit") income += r.amount || 0;
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
