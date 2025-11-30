import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { History } from "@/models/history";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    // Query params
    const id = searchParams.get("id") || searchParams.get("transaction_id");
    const role = searchParams.get("role");
    const user_id = searchParams.get("user_id");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // console.log("GET ADVANCES INPUT:", { date, from, to });

    /** ==================================================
     * 1️⃣ Fetch by ID / transaction_id
     ================================================== */
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

      return NextResponse.json({ success: true, data: [history] }, { status: 200 });
    }

    /** ==================================================
     * 2️⃣ Base Query — Mandatory
     ================================================== */
    let baseQuery: any = {
      advance: true,
      first_payment: true,
      details: "Advance Payment for Account Activation",
    };

    /** ==================================================
     * 3️⃣ Role Filtering
     ================================================== */
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

    /** ==================================================
     * 4️⃣ Search Filter — same logic as history API
     ================================================== */
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
            { user_id: regex },
            { user_name: regex },
            { status: regex },
            { details: regex },
            { date: regex }
          );

          if (!isNaN(Number(term))) {
            orConditions.push({ $expr: { $eq: [{ $floor: "$amount" }, Number(term)] } });
          }
        });

        conditions.push({ $or: orConditions });
      }
    }

    /** ==================================================
     * 5️⃣ Date Parsing Helper — same as history API
     ================================================== */
    function parseDate(input: string | null) {
      if (!input) return null;
      input = input.trim();

      // dd-mm-yyyy or dd/mm/yyyy
      let match = input.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
      if (match) {
        const [_, day, month, year] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // yyyy-mm-dd
      match = input.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
      if (match) {
        const [_, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day));
      }

      // fallback
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }

    /** ==================================================
     * 6️⃣ Single Date
     ================================================== */
    if (date && !from && !to) {
      const parsed = parseDate(date);
      if (parsed) {
        const dd = String(parsed.getDate()).padStart(2, "0");
        const mm = String(parsed.getMonth() + 1).padStart(2, "0");
        const yyyy = parsed.getFullYear();
        conditions.push({ date: `${dd}-${mm}-${yyyy}` });
      }
    }

    /** ==================================================
     * 7️⃣ Date Range
     ================================================== */
    if (from || to) {
      const startDate = parseDate(from);
      const endDate = parseDate(to);

      if (startDate && endDate) {
        const dd1 = String(startDate.getDate()).padStart(2, "0");
        const mm1 = String(startDate.getMonth() + 1).padStart(2, "0");
        const yyyy1 = startDate.getFullYear();

        const dd2 = String(endDate.getDate()).padStart(2, "0");
        const mm2 = String(endDate.getMonth() + 1).padStart(2, "0");
        const yyyy2 = endDate.getFullYear();

        const fromDate = `${dd1}-${mm1}-${yyyy1}`;
        const toDate = `${dd2}-${mm2}-${yyyy2}`;

        conditions.push({
          date: { $gte: fromDate, $lte: toDate },
        });
      }
    }

    /** ==================================================
     * 8️⃣ Final Query
     ================================================== */
    const finalQuery =
      conditions.length > 0 ? { $and: [baseQuery, ...conditions] } : baseQuery;

    // console.log("FINAL ADVANCE QUERY:", JSON.stringify(finalQuery, null, 2));

    /** ==================================================
     * 9️⃣ Fetch from DB
     ================================================== */
    const histories = await History.find(finalQuery).sort({
      created_at: -1,
    });

    return NextResponse.json(
      { success: true, data: histories },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 GET ADVANCES ERROR:", err);
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
