import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Score } from "@/models/score"; // adjust path if needed
import { User }  from "@/models/user";  // adjust path if needed

// ✅ GET - Fetch all users with earned/used/balance + user_name, rank, club, contact
//         Search works across: user_id, user_name, contact, rank, club
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const type   = searchParams.get("type")   || "daily";
    const search = searchParams.get("search") || "";

    const validTypes = ["daily", "fortnight", "cashback", "reward"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid type" },
        { status: 400 }
      );
    }

    // ── Step 1: Fetch ALL score docs ─────────────────────────────────
    // We fetch all first, then filter after joining User data,
    // so search can work across user fields (name, contact, rank, club)
    const docs = await Score.find({}).sort({ updated_at: -1 }).lean() as any[];

    // ── Step 2: Fetch all matching User records in one query ─────────
    const userIds = docs.map((d: any) => d.user_id);

    const userDocs = await User.find(
      { user_id: { $in: userIds } },
      { user_id: 1, user_name: 1, rank: 1, club: 1, contact: 1 }
    ).lean() as any[];

    // Build a map for O(1) lookup
    const userMap: Record<string, any> = {};
    for (const u of userDocs) {
      userMap[u.user_id] = u;
    }

    // ── Step 3: Merge Score + User data ─────────────────────────────
    let rows = docs.map((doc: any) => {
      const wallet   = doc[type]             ?? {};
      const userInfo = userMap[doc.user_id]  ?? {};
      return {
        user_id:   doc.user_id,
        user_name: userInfo.user_name ?? "—",
        contact:   userInfo.contact   ?? "—",
        rank:      userInfo.rank      ?? "—",
        club:      userInfo.club      ?? "—",
        earned:    wallet.earned  ?? 0,
        used:      wallet.used    ?? 0,
        balance:   wallet.balance ?? 0,
      };
    });

    // ── Step 4: Search filter across all important fields ────────────
    if (search) {
      const term = search.trim().toLowerCase();
      rows = rows.filter((row) =>
        (row.user_id   ?? "").toLowerCase().includes(term) ||
        (row.user_name ?? "").toLowerCase().includes(term) ||
        (row.contact   ?? "").toLowerCase().includes(term) ||
        (row.rank      ?? "").toLowerCase().includes(term) ||
        (row.club      ?? "").toLowerCase().includes(term)
      );
    }

    return NextResponse.json(
      { success: true, data: rows, total: rows.length },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}