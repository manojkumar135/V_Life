import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/user";

// ── Parse "DD-MM-YYYY" → Date safely ──
function parseDDMMYYYY(str: string): Date | null {
  if (!str) return null;
  const [dd, mm, yyyy] = str.split("-");
  if (!dd || !mm || !yyyy) return null;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
}

// ── Convert "YYYY-MM-DD" (frontend) → "DD-MM-YYYY" (DB format) ──
function toDBDateFormat(str: string): string {
  if (!str) return "";
  const [yyyy, mm, dd] = str.split("-");
  if (!yyyy || !mm || !dd) return str;
  return `${dd}-${mm}-${yyyy}`;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const date = searchParams.get("date");

    const userQuery: any = {
      user_status: { $regex: /^inactive$/i },
      status_notes: "Deactivated by Admin",
    };

    if (search) {
      userQuery.$or = [
        { user_id:   { $regex: search, $options: "i" } },
        { user_name: { $regex: search, $options: "i" } },
        { contact:   { $regex: search, $options: "i" } },
      ];
    }

    // ✅ correct DB field: activated_date
    if (date) {
      userQuery.activated_date = toDBDateFormat(date);
    }

    const users = await User.find(userQuery)
      .select("user_id user_name contact activated_date user_status status_notes created_at") // ✅ activated_date
      .lean();

    // console.log("Query:", JSON.stringify(userQuery));
    // console.log("Users found:", users.length);
    if (users.length > 0) {
    //   console.log("Sample activated_date:", (users[0] as any).activated_date);
    //   console.log("Sample status_notes:", (users[0] as any).status_notes);
    }

    let data = users.map((u: any) => {
      let activation_date = u.activated_date || ""; // ✅ read from activated_date
      if (!activation_date && u.created_at) {
        const d = new Date(u.created_at);
        activation_date = `${String(d.getDate()).padStart(2, "0")}-${String(
          d.getMonth() + 1
        ).padStart(2, "0")}-${d.getFullYear()}`;
      }

      return {
        user_id: u.user_id,
        user_name: u.user_name || "—",
        contact: u.contact || "—",
        activation_date, // display key stays same for frontend
        user_status: u.user_status || "—",
        status_notes: u.status_notes || "—",
      };
    });

    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00.000Z`);
      const toDate = new Date(`${to}T23:59:59.999Z`);

      data = data.filter((r) => {
        const d = parseDDMMYYYY(r.activation_date);
        if (!d) return false;
        return d >= fromDate && d <= toDate;
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}